from pathlib import Path
import json

from pyspark.sql import SparkSession, functions as fn
from pyspark.sql.types import StructType


def main():
    spark = SparkSession.builder.getOrCreate()

    data_path = Path(__file__).parent.parent / "data"
    with open(data_path / "unified-schema.json") as f:
        json_schema = json.load(f)

    df = spark.read.csv(
        str(data_path / "unified.csv"),
        header=True,
        schema=StructType.fromJson(json_schema),
    )

    df_by_month = df.groupBy(
        fn.month("arrival_time").alias("month_num"),
        fn.date_format("arrival_time", "MMMM").alias("month_name"),
        fn.year("arrival_time").alias("year"),
    )

    def aggregate(*exprs: fn.Column):
        return df_by_month.agg(*exprs).orderBy(fn.col("year"), fn.col("month_num"))

    t1 = Table("Year", "Month", "Cancelation Rate")
    for r in aggregate(
        (fn.sum("canceled") / fn.count("*")).alias("cancelation_rate")
    ).collect():
        t1.add_row(f"{r['year']}", r["month_name"], f"{r['cancelation_rate']:.4f}")
    print(t1, end="\n\n\n")

    t2_1 = Table("Year", "Month", "Average Price/Room/Night")
    for r in aggregate(fn.avg("avg_price_per_room").alias("appr")).collect():
        t2_1.add_row(f"{r['year']}", r["month_name"], f"{r['appr']:,.2f}")
    print(t2_1, end="\n\n\n")

    t2_2 = Table("Year", "Month", "Average Stays in Nights")
    for r in aggregate(fn.avg("stays_in_nights").alias("sin")).collect():
        t2_2.add_row(f"{r['year']}", r["month_name"], f"{r['sin']:,.2f}")
    print(t2_2, end="\n\n\n")

    df_by_segment_month = df.groupBy(
        fn.year("arrival_time").alias("year"),
        fn.month("arrival_time").alias("month_num"),
        fn.date_format("arrival_time", "MMMM").alias("month_name"),
        fn.col("market_segment_type"),
    )

    t3 = Table("Year", "Month", "Market Segment Type", "# Bookings")
    for r in (
        df_by_segment_month.agg(fn.count("*").alias("num"))
        .orderBy("year", "month_num", "market_segment_type")
        .collect()
    ):
        t3.add_row(
            f"{r['year']}", r["month_name"], r["market_segment_type"], f"{r['num']}"
        )
    print(t3, end="\n\n\n")

    t4 = Table("Month", "Average Revenue")
    t4_df = (
        aggregate(
            (fn.avg("avg_price_per_room") * fn.sum("stays_in_nights")).alias("revenue")
        )
        .groupBy("month_name", "month_num")
        .agg((fn.sum("revenue") / fn.count("*")).alias("avg_revenue"))
        .orderBy("month_num")
    )
    for r in t4_df.collect():
        t4.add_row(r["month_name"], f"{r['avg_revenue']:,.2f}")
    print(t4, end="\n\n\n")

    top_revenue_row = t4_df.orderBy(fn.desc("avg_revenue")).first()
    assert top_revenue_row
    top_month = top_revenue_row["month_name"]
    top_revenue = top_revenue_row["avg_revenue"]

    print(f"{top_month} had the highest average revenue at ${top_revenue:,.2f}")


class Table:
    """A displayable table."""

    def __init__(self, *column_names: str):
        self._column_names = [*column_names]
        self._num_columns = len(column_names)
        self._rows: list[tuple[str, ...]] = []
        self._max_column_lengths = [len(c) for c in column_names]

    def add_row(self, *columns: str):
        """Append a row to this table"""
        if len(columns) != self._num_columns:
            return ValueError(
                f"Cannot add a row with {len(columns)} entries to a table with {self._num_columns} columns."
            )

        self._max_column_lengths = [
            max(len(c), l) for c, l in zip(columns, self._max_column_lengths)
        ]

        self._rows.append(columns)

    def as_str(self, extra_space: int = 4):
        column_widths = list(map(lambda l: l + extra_space, self._max_column_lengths))

        def format_row(row: tuple[str, ...]) -> str:
            return "".join(f"{val:<{w}}" for val, w in zip(row, column_widths))

        return "\n".join(
            [
                format_row(tuple(self._column_names)),
                "-" * (sum(column_widths) - extra_space),
                *map(format_row, self._rows),
            ]
        )

    def print(self, extra_space: int = 4):
        """Print the table to standard output."""
        print(self.as_str(extra_space=extra_space))

    def __str__(self):
        return self.as_str()


if __name__ == "__main__":
    main()
