package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joshua-zingale/236-course-project/phase-3/server"
)

func main() {
	dbpool, err := pgxpool.New(context.Background(), "postgres://postgres:postgres@127.0.0.1:5001/postgres")
	if err != nil {
		log.Fatalf("Could not connect to database: %s", err)
	}

	defer dbpool.Close()

	fmt.Println("Web server listening on 127.0.0.1:5000")

	http.ListenAndServe("127.0.0.1:5000", server.NewHotelDataMux(server.HotelDataMuxOptions{
		Pool: dbpool,
	}))
}
