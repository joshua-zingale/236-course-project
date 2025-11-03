from pathlib import Path
import json

from pyspark.sql import SparkSession, functions as fn
from pyspark.sql.types import StructType


def main():

    # ######### #
    # LOAD DATA #
    # ######### #
    spark = SparkSession.builder.getOrCreate()

    data_path = Path(__file__).parent.parent / "data"
    with open(data_path / "unified-schema.json") as f:
        json_schema = json.load(f)

    df = spark.read.csv(
        str(data_path / "unified.csv"),
        header=True,
        schema=StructType.fromJson(json_schema),
    )

    # ################### #
    # GROUP DATA BY MONTH #
    # ################### #
    df_by_month = df.groupBy(
        fn.month("arrival_time").alias("month_num"),
        fn.date_format("arrival_time", "MMMM").alias("month_name"),
        fn.year("arrival_time").alias("year"),
    )

    def aggregate(*exprs: fn.Column):
        """A helper function that adds aggregate columns to the data gruped by month"""
        return df_by_month.agg(*exprs).orderBy(fn.col("year"), fn.col("month_num"))

    # ################## #
    # CANCELLATION RATES #
    # ################## #
    t1_df = aggregate(
        (fn.sum("canceled") / fn.count("*")).alias("cancelation_rate")
    )
    print(t1_df.toPandas().to_markdown(index=False), end="\n\n\n")

    # ######## #
    # AVERAGES #
    # ######## #
    t2_df = aggregate(
        fn.avg("avg_price_per_room").alias("appr"),
        fn.avg("stays_in_nights").alias("sin"))
    print(t2_df.toPandas().to_markdown(index=False), end="\n\n\n")

    # ################ #
    # MONTHLY BOOKINGS #
    # ################ #
    df_by_segment_month = df.groupBy(
        fn.year("arrival_time").alias("year"),
        fn.month("arrival_time").alias("month_num"),
        fn.date_format("arrival_time", "MMMM").alias("month_name"),
        fn.col("market_segment_type"),
    )
    t3_df = (
        df_by_segment_month.agg(fn.count("*").alias("num"))
        .orderBy("year", "month_num", "market_segment_type"))
    print(t3_df.toPandas().to_markdown(index=False), end="\n\n\n")

    # ########### #
    # SEASONALITY #
    # ########### #
    t4_df = (
        aggregate(
            (fn.avg("avg_price_per_room") * fn.sum("stays_in_nights")).alias("revenue")
        )
        .groupBy("month_name", "month_num")
        .agg((fn.sum("revenue") / fn.count("*")).alias("avg_revenue"))
        .orderBy("month_num")
    )
    print(t4_df.toPandas().to_markdown(index=False, floatfmt=',.2f'), end="\n\n\n")

    top_revenue_row = t4_df.orderBy(fn.desc("avg_revenue")).first()
    assert top_revenue_row
    top_month = top_revenue_row["month_name"]
    top_revenue = top_revenue_row["avg_revenue"]

    print(f"{top_month} had the highest average revenue at ${top_revenue:,.2f}")


if __name__ == "__main__":
    main()
