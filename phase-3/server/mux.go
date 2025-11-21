package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HotelDataMuxOptions struct {
	Pool *pgxpool.Pool
}

//go:embed all:static
var staticAssets embed.FS

func NewHotelDataMux(opts HotelDataMuxOptions) *http.ServeMux {

	mux := http.NewServeMux()

	handler := dbHandler{pool: opts.Pool}

	mux.HandleFunc("GET /favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	fs := http.FileServer(http.FS(staticAssets))
	mux.Handle("GET /static/", fs)

	mux.HandleFunc("GET /api/tables", handler.handleGetTables)

	mux.HandleFunc("POST /api/query", handler.handleQuery)

	mux.HandleFunc("GET /", handleDataView)

	return mux
}

type dbHandler struct {
	pool *pgxpool.Pool
}

func (h dbHandler) handleGetTables(w http.ResponseWriter, r *http.Request) {
	res := fetchQueryResult(r.Context(), h.pool, `
		SELECT
			t.table_name,
			ARRAY_AGG(jsonb_build_object('name', c.column_name, 'type', c.data_type)) AS columns
		FROM
			information_schema.tables t
		JOIN
			information_schema.columns c
			ON t.table_name = c.table_name
		WHERE
			t.table_schema = 'public'
		GROUP BY
			t.table_name`)

	writeJson(w, res)
}

func (h dbHandler) handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Content-Type") != "application/json" {
		http.Error(w, fmt.Sprintf("Invalid Content-Type: expected '%s'", "application/json"), 500)
		return
	}

	query, err := readJson[Query](r)
	if err != nil {
		http.Error(w, fmt.Sprintf("Could not parse body as JSON: %s", err), 400)
		return
	}

	selectClause, _ := columnsToSelectClause(query.Columns)

	fromClause, _ := tableNameToFromClause(query.Table)

	whereClause, err := constraintsToWhereClause(query.Constraints)
	if err != nil {
		writeJson(w, QueryResult{
			Error: fmt.Sprintf("Invalid Constraint: %s", err),
		})
		return
	}

	orderByClause, _ := orderingsToOrderByClause(query.Order)

	offsetFetchClause, _ := getOffsetFetchClause(query.Offset, query.Limit)

	clauses := []string{selectClause, fromClause, whereClause, orderByClause, offsetFetchClause}
	sql := strings.Join(clauses, "\n")

	res := fetchQueryResult(r.Context(), h.pool, sql)

	writeJson(w, res)
}

func columnsToSelectClause(columns []string) (string, error) {
	var sanitizedColumns []string
	for _, unsanitizedColumn := range columns {
		sanitizedColumns = append(sanitizedColumns, parseIdentifier(unsanitizedColumn))
	}
	if len(columns) == 0 {
		sanitizedColumns = []string{"*"}
	}
	return "SELECT " + strings.Join(sanitizedColumns, ","), nil
}

func tableNameToFromClause(table string) (string, error) {
	return "FROM " + parseIdentifier(table), nil
}

func constraintsToWhereClause(constraints []Constraint) (string, error) {
	constraintStrings := []string{}
	for _, constraint := range constraints {
		column := parseIdentifier(constraint.Column)
		var argument string
		switch arg := constraint.Argument.(type) {
		case int:
			argument = fmt.Sprintf("%d", arg)
		case float32:
			argument = fmt.Sprintf("%f", arg)
		case float64:
			argument = fmt.Sprintf("%f", arg)
		case string:
			argument = fmt.Sprintf("'%s'", arg)
		default:
			return "", fmt.Errorf("invalid argument type: must be a string or a number")
		}
		if operator, ok := operatorMap[constraint.Operator]; ok {
			constraintStrings = append(constraintStrings, fmt.Sprintf("%s %s %s", column, operator, argument))
		} else {
			var keys []string
			for key := range operatorMap {
				keys = append(keys, key)
			}
			return "", fmt.Errorf("invalid operator '%s': must be one of [%s]", constraint.Operator, strings.Join(keys, ", "))
		}
	}
	if len(constraintStrings) == 0 {
		return "", nil
	}
	return fmt.Sprintf("WHERE %s", strings.Join(constraintStrings, " AND ")), nil
}

func orderingsToOrderByClause(orderings []Ordering) (string, error) {
	stringOrderings := []string{}

	for _, ordering := range orderings {
		scent := "ASC"
		if ordering.Descending {
			scent = "DESC"
		}
		stringOrderings = append(stringOrderings, fmt.Sprintf("%s %s", parseIdentifier(ordering.Column), scent))
	}

	if len(stringOrderings) == 0 {
		return "", nil
	}
	return fmt.Sprintf("ORDER BY %s", strings.Join(stringOrderings, ", ")), nil
}

func getOffsetFetchClause(offset int, limit int) (string, error) {
	return fmt.Sprintf(`
	OFFSET %d ROWS
	FETCH NEXT %d ROWS ONLY`, offset, limit), nil
}

func handleDataView(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/html")
	data, err := staticAssets.ReadFile("static/index.html")
	if err != nil {
		log.Printf("Could not load index template: %s", err)
		http.Error(w, "Internal Error. Please try again later.", 500)
		return
	}

	w.Write(data)

}

type QueryResult struct {
	Error string           `json:"error,omitempty"`
	Rows  []map[string]any `json:"rows,omitempty"`
}

type Query struct {
	Columns     []string     `json:"columns"`
	Constraints []Constraint `json:"constraints"`
	Table       string       `json:"table"`
	Offset      int          `json:"offset"`
	Limit       int          `json:"limit"`
	Order       []Ordering   `json:"order"`
}

type Ordering struct {
	Column     string `json:"column"`
	Descending bool   `json:"descending"`
}

type Constraint struct {
	Operator string `json:"operator"`
	Column   string `json:"column"`
	Argument any    `json:"argument"`
}

var operatorMap = map[string]string{
	"<":        "<",
	"<=":       "<=",
	"=":        "=",
	"!=":       "!=",
	">=":       ">=",
	">":        ">",
	"like":     "LIKE",
	"not like": "NOT LIKE",
}

func fetchQueryResult(ctx context.Context, pool *pgxpool.Pool, sql string, args ...any) *QueryResult {

	log.Println(sql)

	rows, err := pool.Query(ctx, sql, args...)
	if err != nil {
		return &QueryResult{
			Error: err.Error(),
		}
	}

	res, err := rowsToQueryResult(rows)
	if err != nil {
		return &QueryResult{
			Error: err.Error(),
		}
	}

	return res

}

func rowsToQueryResult(rows pgx.Rows) (*QueryResult, error) {

	descriptiors := rows.FieldDescriptions()

	var outRows []map[string]any

	for rows.Next() {
		outRow := make(map[string]any)
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("getting values %s", err)
		}

		for i, des := range descriptiors {
			outRow[des.Name] = values[i]
		}

		outRows = append(outRows, outRow)
	}
	return &QueryResult{
		Rows: outRows,
	}, nil
}

// Returns a sanitized string safe for SQL interpolation.
func parseIdentifier(unsanitizedIdentifier string) string {
	return pgx.Identifier{unsanitizedIdentifier}.Sanitize()
}

// Reads one JSON object from the request's body.
func readJson[T any](r *http.Request) (T, error) {
	var inObj T
	err := json.NewDecoder(r.Body).Decode(&inObj)
	return inObj, err
}

// Sets Content-Type to application/json and writes a marshalled version the object
func writeJson(w http.ResponseWriter, obj any) error {
	w.Header().Add("Content-Type", "applicaiton/json")
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(obj); err != nil {
		return fmt.Errorf("marshalling: %s", err)
	}
	return nil
}
