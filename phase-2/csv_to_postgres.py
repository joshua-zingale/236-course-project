"""Loads a CSV file alongside a schema file to create a table in a postgres database.

This will OVERWRITE any data in the target table.
"""

import json

from pyspark.sql import SparkSession
from pyspark.sql.types import StructType

from argparse import ArgumentParser
import sys
def main(argv: list[str]):

    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True, help="the host at which postgres is running, e.g. '127.0.0.1'.")
    parser.add_argument("--port", type=int, required=True, help="the port on which postgres is running, e.g. '5432'.")
    parser.add_argument("--user", required=True, help="the postgres user, e.g. 'postgres'.")
    parser.add_argument("--password", required=True, help="the postgres user's password, e.g. 'super-secret-password'.")
    parser.add_argument("--db", required=True, help="the postgres database name.")
    parser.add_argument("--table", required=True, help="the name of the table to which the data will be stored. The table's data are OVERWRITTEN.")
    parser.add_argument("--csv", required=True, help="the csv file that will be loaded.")
    parser.add_argument("--schema", required=True, help="the schema file that will be loaded.")
    args = parser.parse_args(argv[1:])

    # ######### #
    # LOAD DATA #
    # ######### #
    spark = SparkSession.builder.getOrCreate()

    with open(args.schema) as f:
        json_schema = json.load(f)

    df = spark.read.csv(
        args.csv,
        header=True,
        schema=StructType.fromJson(json_schema),
    )

    # ###################### #
    # WRITE DATA TO DATABASE #
    # ###################### #

    df.write.jdbc(
        url=f"jdbc:postgresql://{args.host}:{args.port}/{args.db}",
        table=f"{args.table}",
        properties = {
            "user": f"{args.user}",
            "password": f"{args.password}",
            "driver": "org.postgresql.Driver",
        },
        mode="overwrite",
        )


if __name__ == "__main__":
    main(sys.argv)
