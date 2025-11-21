package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joshua-zingale/236-course-project/phase-3/server"
)

func main() {

	dbPort := flag.Int("dbport", 5432, "the port of the database")
	flag.Parse()

	dbpool, err := pgxpool.New(context.Background(), fmt.Sprintf("postgres://postgres:postgres@127.0.0.1:%d/postgres", *dbPort))
	if err != nil {
		log.Fatalf("Could not connect to database: %s", err)
	}

	defer dbpool.Close()

	fmt.Println("Web server listening on 127.0.0.1:5000")

	http.ListenAndServe("127.0.0.1:5000", server.NewHotelDataMux(server.HotelDataMuxOptions{
		Pool: dbpool,
	}))
}
