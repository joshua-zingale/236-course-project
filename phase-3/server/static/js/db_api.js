export {fetchQueryResult, fetchTableList};

/**
 * @typedef {Object} Ordering
 * @property {string} column - The database column name to sort by.
 * @property {boolean} descending - If true, the sort order is descending (DESC). If false or omitted, it is ascending (ASC).
 */

/**
 * @typedef {Object} Constraint
 * @property {('='|'!='|'<'|'<='|'>'|'>='|'like'|'not like')} operator - The SQL comparison operator.
 * @property {string} column - The database column name to apply the constraint to.
 * @property {any} argument - The value to compare against the column.
 */

/**
 * @typedef {Object} Query
 * @property {string[]} columns - The list of columns to select from the table.
 * @property {Constraint[]} constraints - A list of conditions to apply in the WHERE clause.
 * @property {string} table - The name of the table to query.
 * @property {number} offset - The number of rows to skip before starting to return rows (for pagination).
 * @property {number} limit - The maximum number of rows to return.
 * @property {Ordering[]} order - A list of columns and directions to order the results by.
 */

/**
 * @typedef {Object} QueryResult
 * @property {string} [error] - An error message if the query failed. Omitted if successful.
 * @property {Object<string, any>[]} [rows] - An array of result rows, where each row is a map of column names to values. Omitted if an error occurred.
 */

/**
 * Fetches data from the admin panel API by sending a structured Query object.
 *
 * @param {Query} query - The structured query object defining the table, columns, and constraints.
 * @returns {Promise<QueryResult>} A promise that resolves to the QueryResult object from the API.
 */
async function fetchQueryResult(query) {
    const API_ENDPOINT = '/api/query';

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorText}`);
        }

        const result = await response.json();

        if (result.Error) {
            throw new Error(`Backend Error: ${result.Error}`);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch query results:", error.message);

        return {
            Error: error.message,
        };
    }
};


/**
 * @typedef {Object} ColumnInfo
 * @property {string} name - The name of the field.
 * @property {string} type - The type of the field.
 */


/**
 * @typedef {Object} TableInfo
 * @property {string} table_name - The name of the database table (e.g., 'unified_reservations').
 * @property {ColumnInfo[]} columns - An array of column details for the table.
 */

/**
 * @typedef {Object} TableListQueryResult
 * @property {string} [error] - An error message if the query failed. Omitted if successful.
 * @property {TableInfo[]} [rows] - An array of table and column information (from the Go QueryResult struct's Rows field).
 */


/**
 * Fetches the list of tables and their column metadata.
 *
 * @returns {Promise<TableListQueryResult>} A promise that resolves to the TableListQueryResult object.
 */
async function fetchTableList() {
    const API_ENDPOINT = '/api/tables';

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorText}`);
        }

        const result = await response.json();

        if (result.Error) {
            throw new Error(`Backend Error: ${result.Error}`);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch table list:", error.message);

        return {
            Error: error.message,
        };
    }
};