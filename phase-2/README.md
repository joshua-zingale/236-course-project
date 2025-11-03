# Phase 2: Spark Analysis and Database Population

## Spark Analysis

To calculate the specified statistics, I opted to use my unified dataset because otherwise separate queries would need to be drafted for the different datasets.

The statistics are given by the tables in the `Statistics` section. 
The statistics were calculated with [analysis.py](./analysis.py).

All specified statistics required some kind of grouping at least by month.
The appropriate statics were calculated using aggregation operators like count, sum, and average.

Unspecified in the assignment document was how bookings spanning multiple months should be handled. I opted to let all nights of a booking count for the month in which the arrival time occurred.
Similarly, the assignment document did not specify whether the data of booking (as determined by lead time and arrival time) or the arrival time should count for computing monthly averages.
Again, I used the arrival time of a booking to determine the cancellation rates, averages, monthly bookings, and seasonality statistics.


## Database Population

I used `DataFrame.write.jdbc` to load the data form Spark into Postgres with Python. The method converts a DataFrame into a table in the database management system. 

Since the same procedure needed to occur for each of the three datasets,
for both provided datasets and the one unified dataset,
I wrote a script, [csv_to_postgres.py](./csv_to_postgres.py), that can load CSV data into a specified database with a given schema. The script must be run using the `spark-submit` utility. For example,

```bash
spark-submit --packages org.postgresql:postgresql:42.7.3 csv_to_postgres.py -h
```

will print the help menu, which looks like so:


```
usage: csv_to_postgres.py [-h] --host HOST --port PORT --user USER
                          --password PASSWORD --db DB --table TABLE --csv CSV
                          --schema SCHEMA

Loads a CSV file alongside a schema file to create a table in a postgres
database. This will OVERWRITE any data in the target table. The script must be
run using the spark-submit utility. For example, spark-submit --packages
org.postgresql:postgresql:42.7.3 csv_to_postgres.py -h

options:
  -h, --help           show this help message and exit
  --host HOST          the host at which postgres is running, e.g.
                       '127.0.0.1'.
  --port PORT          the port on which postgres is running, e.g. '5432'.
  --user USER          the postgres user, e.g. 'postgres'.
  --password PASSWORD  the postgres user's password, e.g. 'super-secret-
                       password'.
  --db DB              the postgres database name.
  --table TABLE        the name of the table to which the data will be stored.
                       The table's data are OVERWRITTEN.
  --csv CSV            the csv file that will be loaded.
  --schema SCHEMA      the schema file that will be loaded.
```

The schemata that I used for the three tables are in

- [customer-reservations-schema.json](/data/customer-reservations-schema.json)
- [hotel-booking-schema.json](/data/hotel-booking-schema.json)
- [unified-schema.json](/data/unified-schema.json)

The schemata are as to be expected, with each column in the original data mapping to a column in Postgres with an appropriate datatype, such as Text, Integer, or Date.

After using the script to populate a Postgres database, I dumped the data into [sql-data.sql](/data/sql-data.sql) with `pg_dump`.



## Statistics

Herein are the statistics specified as to be found by the assignment document.

### Cancellation Rates

`cancelation_rate` is the Cancellation Rate for each month in the dataset.

|   month_num | month_name   |   year |   cancelation_rate |                    
|------------:|:-------------|-------:|-------------------:|
|           7 | July         |   2015 |          0.45353   |
|           8 | August       |   2015 |          0.410903  |
|           9 | September    |   2015 |          0.409464  |
|          10 | October      |   2015 |          0.349405  |
|          11 | November     |   2015 |          0.207692  |
|          12 | December     |   2015 |          0.333219  |
|           1 | January      |   2016 |          0.247776  |
|           2 | February     |   2016 |          0.343613  |
|           3 | March        |   2016 |          0.306177  |
|           4 | April        |   2016 |          0.379698  |
|           5 | May          |   2016 |          0.34958   |
|           6 | June         |   2016 |          0.39607   |
|           7 | July         |   2016 |          0.327865  |
|           8 | August       |   2016 |          0.360458  |
|           9 | September    |   2016 |          0.374861  |
|          10 | October      |   2016 |          0.405288  |
|          11 | November     |   2016 |          0.36731   |
|          12 | December     |   2016 |          0.362176  |
|           7 | July         |   2017 |          0.669421  |
|           8 | August       |   2017 |          0.182446  |
|           9 | September    |   2017 |          0.11037   |
|          10 | October      |   2017 |          0.157867  |
|          11 | November     |   2017 |          0.0417311 |
|          12 | December     |   2017 |          0.0237069 |
|           1 | January      |   2018 |          0.0236686 |
|           2 | February     |   2018 |          0.253749  |
|           3 | March        |   2018 |          0.295198  |
|           4 | April        |   2018 |          0.36367   |
|           5 | May          |   2018 |          0.364896  |
|           6 | June         |   2018 |          0.40306   |
|           7 | July         |   2018 |          0.41885   |
|           8 | August       |   2018 |          0.465523  |
|           9 | September    |   2018 |          0.457799  |
|          10 | October      |   2018 |          0.463572  |
|          11 | November     |   2018 |          0.36348   |
|          12 | December     |   2018 |          0.181558  |


### Averages

`appr` is the average price per room per night and `sin` is the average stays in nights.

|   month_num | month_name   |   year |     appr |     sin |
|------------:|:-------------|-------:|---------:|--------:|
|           7 | July         |   2015 |  97.8343 | 3.86816 |
|           8 | August       |   2015 | 105.923  | 3.70327 |
|           9 | September    |   2015 |  94.8187 | 3.47478 |
|          10 | October      |   2015 |  78.8954 | 3.05649 |
|          11 | November     |   2015 |  60.5803 | 3.27094 |
|          12 | December     |   2015 |  74.0792 | 3.0387  |
|           1 | January      |   2016 |  64.7677 | 2.74066 |
|           2 | February     |   2016 |  70.1023 | 2.8769  |
|           3 | March        |   2016 |  79.0693 | 3.23238 |
|           4 | April        |   2016 |  88.9189 | 3.19786 |
|           5 | May          |   2016 |  96.3993 | 3.20847 |
|           6 | June         |   2016 | 106.977  | 3.41931 |
|           7 | July         |   2016 | 125.485  | 3.9521  |
|           8 | August       |   2016 | 142.894  | 3.90934 |
|           9 | September    |   2016 | 114.75   | 3.45847 |
|          10 | October      |   2016 |  95.1118 | 3.18169 |
|          11 | November     |   2016 |  80.7376 | 3.14616 |
|          12 | December     |   2016 |  86.3702 | 3.36166 |
|           7 | July         |   2017 |  84.8905 | 3.29477 |
|           8 | August       |   2017 |  91.0914 | 2.90039 |
|           9 | September    |   2017 | 103.335  | 2.69072 |
|          10 | October      |   2017 |  92.032  | 2.69263 |
|          11 | November     |   2017 |  72.3391 | 2.70788 |
|          12 | December     |   2017 |  75.4305 | 3.07112 |
|           1 | January      |   2018 |  74.7498 | 2.73274 |
|           2 | February     |   2018 |  80.5283 | 2.86683 |
|           3 | March        |   2018 |  91.8544 | 3.16952 |
|           4 | April        |   2018 | 101.999  | 2.95906 |
|           5 | May          |   2018 | 113.811  | 2.97498 |
|           6 | June         |   2018 | 111.967  | 2.72401 |
|           7 | July         |   2018 | 115.448  | 3.35784 |
|           8 | August       |   2018 | 121.215  | 3.36013 |
|           9 | September    |   2018 | 122.906  | 2.9892  |
|          10 | October      |   2018 | 111.446  | 2.9718  |
|          11 | November     |   2018 |  96.5397 | 3.09216 |
|          12 | December     |   2018 |  94.9475 | 3.42905 |


### Monthly Bookings


`num` gives the number of bookings for the specified month in a given year.

|   year |   month_num | month_name   | market_segment_type   |   num |
|-------:|------------:|:-------------|:----------------------|------:|
|   2015 |           7 | July         | Complementary         |     6 |
|   2015 |           7 | July         | Corporate             |    27 |
|   2015 |           7 | July         | Direct                |   287 |
|   2015 |           7 | July         | Groups                |   958 |
|   2015 |           7 | July         | Offline TA/TO         |   617 |
|   2015 |           7 | July         | Online TA             |   881 |
|   2015 |           8 | August       | Complementary         |    33 |
|   2015 |           8 | August       | Corporate             |    96 |
|   2015 |           8 | August       | Direct                |   568 |
|   2015 |           8 | August       | Groups                |  1142 |
|   2015 |           8 | August       | Offline TA/TO         |   768 |
|   2015 |           8 | August       | Online TA             |  1280 |
|   2015 |           8 | August       | Undefined             |     2 |
|   2015 |           9 | September    | Complementary         |    26 |
|   2015 |           9 | September    | Corporate             |   193 |
|   2015 |           9 | September    | Direct                |   410 |
|   2015 |           9 | September    | Groups                |  1671 |
|   2015 |           9 | September    | Offline TA/TO         |  1604 |
|   2015 |           9 | September    | Online TA             |  1210 |
|   2015 |          10 | October      | Complementary         |    33 |
|   2015 |          10 | October      | Corporate             |   228 |
|   2015 |          10 | October      | Direct                |   390 |
|   2015 |          10 | October      | Groups                |  1403 |
|   2015 |          10 | October      | Offline TA/TO         |  1681 |
|   2015 |          10 | October      | Online TA             |  1222 |
|   2015 |          11 | November     | Complementary         |    30 |
|   2015 |          11 | November     | Corporate             |   450 |
|   2015 |          11 | November     | Direct                |   241 |
|   2015 |          11 | November     | Groups                |   462 |
|   2015 |          11 | November     | Offline TA/TO         |   519 |
|   2015 |          11 | November     | Online TA             |   638 |
|   2015 |          12 | December     | Complementary         |    37 |
|   2015 |          12 | December     | Corporate             |   177 |
|   2015 |          12 | December     | Direct                |   418 |
|   2015 |          12 | December     | Groups                |   464 |
|   2015 |          12 | December     | Offline TA/TO         |   890 |
|   2015 |          12 | December     | Online TA             |   934 |
|   2016 |           1 | January      | Complementary         |    36 |
|   2016 |           1 | January      | Corporate             |   192 |
|   2016 |           1 | January      | Direct                |   369 |
|   2016 |           1 | January      | Groups                |   205 |
|   2016 |           1 | January      | Offline TA/TO         |   497 |
|   2016 |           1 | January      | Online TA             |   949 |
|   2016 |           2 | February     | Aviation              |     1 |
|   2016 |           2 | February     | Complementary         |    30 |
|   2016 |           2 | February     | Corporate             |   395 |
|   2016 |           2 | February     | Direct                |   523 |
|   2016 |           2 | February     | Groups                |   577 |
|   2016 |           2 | February     | Offline TA/TO         |   856 |
|   2016 |           2 | February     | Online TA             |  1509 |
|   2016 |           3 | March        | Aviation              |     3 |
|   2016 |           3 | March        | Complementary         |    32 |
|   2016 |           3 | March        | Corporate             |   284 |
|   2016 |           3 | March        | Direct                |   491 |
|   2016 |           3 | March        | Groups                |   671 |
|   2016 |           3 | March        | Offline TA/TO         |  1061 |
|   2016 |           3 | March        | Online TA             |  2282 |
|   2016 |           4 | April        | Aviation              |    25 |
|   2016 |           4 | April        | Complementary         |    22 |
|   2016 |           4 | April        | Corporate             |   195 |
|   2016 |           4 | April        | Direct                |   462 |
|   2016 |           4 | April        | Groups                |  1093 |
|   2016 |           4 | April        | Offline TA/TO         |  1171 |
|   2016 |           4 | April        | Online TA             |  2460 |
|   2016 |           5 | May          | Aviation              |    29 |
|   2016 |           5 | May          | Complementary         |    30 |
|   2016 |           5 | May          | Corporate             |   320 |
|   2016 |           5 | May          | Direct                |   449 |
|   2016 |           5 | May          | Groups                |  1206 |
|   2016 |           5 | May          | Offline TA/TO         |  1150 |
|   2016 |           5 | May          | Online TA             |  2294 |
|   2016 |           6 | June         | Aviation              |     6 |
|   2016 |           6 | June         | Complementary         |    23 |
|   2016 |           6 | June         | Corporate             |   155 |
|   2016 |           6 | June         | Direct                |   393 |
|   2016 |           6 | June         | Groups                |   537 |
|   2016 |           6 | June         | Offline TA/TO         |  1964 |
|   2016 |           6 | June         | Online TA             |  2214 |
|   2016 |           7 | July         | Aviation              |     3 |
|   2016 |           7 | July         | Complementary         |    20 |
|   2016 |           7 | July         | Corporate             |   144 |
|   2016 |           7 | July         | Direct                |   532 |
|   2016 |           7 | July         | Groups                |   285 |
|   2016 |           7 | July         | Offline TA/TO         |   864 |
|   2016 |           7 | July         | Online TA             |  2724 |
|   2016 |           8 | August       | Complementary         |    13 |
|   2016 |           8 | August       | Corporate             |    59 |
|   2016 |           8 | August       | Direct                |   652 |
|   2016 |           8 | August       | Groups                |   239 |
|   2016 |           8 | August       | Offline TA/TO         |   722 |
|   2016 |           8 | August       | Online TA             |  3378 |
|   2016 |           9 | September    | Aviation              |    18 |
|   2016 |           9 | September    | Complementary         |    27 |
|   2016 |           9 | September    | Corporate             |   175 |
|   2016 |           9 | September    | Direct                |   468 |
|   2016 |           9 | September    | Groups                |   879 |
|   2016 |           9 | September    | Offline TA/TO         |  1367 |
|   2016 |           9 | September    | Online TA             |  2460 |
|   2016 |          10 | October      | Aviation              |    29 |
|   2016 |          10 | October      | Complementary         |    36 |
|   2016 |          10 | October      | Corporate             |   200 |
|   2016 |          10 | October      | Direct                |   502 |
|   2016 |          10 | October      | Groups                |  1128 |
|   2016 |          10 | October      | Offline TA/TO         |  1468 |
|   2016 |          10 | October      | Online TA             |  2840 |
|   2016 |          11 | November     | Aviation              |    13 |
|   2016 |          11 | November     | Complementary         |    41 |
|   2016 |          11 | November     | Corporate             |   255 |
|   2016 |          11 | November     | Direct                |   383 |
|   2016 |          11 | November     | Groups                |   681 |
|   2016 |          11 | November     | Offline TA/TO         |   804 |
|   2016 |          11 | November     | Online TA             |  2277 |
|   2016 |          12 | December     | Complementary         |    54 |
|   2016 |          12 | December     | Corporate             |   188 |
|   2016 |          12 | December     | Direct                |   439 |
|   2016 |          12 | December     | Groups                |   356 |
|   2016 |          12 | December     | Offline TA/TO         |   549 |
|   2016 |          12 | December     | Online TA             |  2274 |
|   2017 |           7 | July         | Complementary         |     5 |
|   2017 |           7 | July         | Corporate             |     4 |
|   2017 |           7 | July         | Offline               |   167 |
|   2017 |           7 | July         | Online                |   187 |
|   2017 |           8 | August       | Complementary         |    37 |
|   2017 |           8 | August       | Corporate             |    73 |
|   2017 |           8 | August       | Offline               |   343 |
|   2017 |           8 | August       | Online                |   561 |
|   2017 |           9 | September    | Complementary         |    27 |
|   2017 |           9 | September    | Corporate             |   133 |
|   2017 |           9 | September    | Offline               |   766 |
|   2017 |           9 | September    | Online                |   723 |
|   2017 |          10 | October      | Complementary         |    22 |
|   2017 |          10 | October      | Corporate             |   107 |
|   2017 |          10 | October      | Offline               |  1014 |
|   2017 |          10 | October      | Online                |   770 |
|   2017 |          11 | November     | Complementary         |    16 |
|   2017 |          11 | November     | Corporate             |    88 |
|   2017 |          11 | November     | Offline               |   274 |
|   2017 |          11 | November     | Online                |   269 |
|   2017 |          12 | December     | Complementary         |    32 |
|   2017 |          12 | December     | Corporate             |    93 |
|   2017 |          12 | December     | Offline               |   362 |
|   2017 |          12 | December     | Online                |   441 |
|   2018 |           1 | January      | Complementary         |    30 |
|   2018 |           1 | January      | Corporate             |   106 |
|   2018 |           1 | January      | Offline               |   314 |
|   2018 |           1 | January      | Online                |   564 |
|   2018 |           2 | February     | Aviation              |     1 |
|   2018 |           2 | February     | Complementary         |    17 |
|   2018 |           2 | February     | Corporate             |   200 |
|   2018 |           2 | February     | Offline               |   428 |
|   2018 |           2 | February     | Online                |  1021 |
|   2018 |           3 | March        | Aviation              |     3 |
|   2018 |           3 | March        | Complementary         |    24 |
|   2018 |           3 | March        | Corporate             |   173 |
|   2018 |           3 | March        | Offline               |   548 |
|   2018 |           3 | March        | Online                |  1647 |
|   2018 |           4 | April        | Aviation              |    25 |
|   2018 |           4 | April        | Complementary         |    12 |
|   2018 |           4 | April        | Corporate             |    65 |
|   2018 |           4 | April        | Offline               |   661 |
|   2018 |           4 | April        | Online                |  1973 |
|   2018 |           5 | May          | Aviation              |    29 |
|   2018 |           5 | May          | Complementary         |    23 |
|   2018 |           5 | May          | Corporate             |   219 |
|   2018 |           5 | May          | Offline               |   651 |
|   2018 |           5 | May          | Online                |  1676 |
|   2018 |           6 | June         | Aviation              |     6 |
|   2018 |           6 | June         | Complementary         |    21 |
|   2018 |           6 | June         | Corporate             |    99 |
|   2018 |           6 | June         | Offline               |  1371 |
|   2018 |           6 | June         | Online                |  1706 |
|   2018 |           7 | July         | Aviation              |     2 |
|   2018 |           7 | July         | Complementary         |    13 |
|   2018 |           7 | July         | Corporate             |   109 |
|   2018 |           7 | July         | Offline               |   471 |
|   2018 |           7 | July         | Online                |  1962 |
|   2018 |           8 | August       | Complementary         |    11 |
|   2018 |           8 | August       | Corporate             |    48 |
|   2018 |           8 | August       | Offline               |   397 |
|   2018 |           8 | August       | Online                |  2343 |
|   2018 |           9 | September    | Aviation              |    18 |
|   2018 |           9 | September    | Complementary         |    25 |
|   2018 |           9 | September    | Corporate             |   125 |
|   2018 |           9 | September    | Offline               |   826 |
|   2018 |           9 | September    | Online                |  1968 |
|   2018 |          10 | October      | Aviation              |    29 |
|   2018 |          10 | October      | Complementary         |    23 |
|   2018 |          10 | October      | Corporate             |   114 |
|   2018 |          10 | October      | Offline               |  1054 |
|   2018 |          10 | October      | Online                |  2184 |
|   2018 |          11 | November     | Aviation              |    12 |
|   2018 |          11 | November     | Complementary         |    28 |
|   2018 |          11 | November     | Corporate             |   147 |
|   2018 |          11 | November     | Offline               |   527 |
|   2018 |          11 | November     | Online                |  1619 |
|   2018 |          12 | December     | Complementary         |    25 |
|   2018 |          12 | December     | Corporate             |   114 |
|   2018 |          12 | December     | Offline               |   354 |
|   2018 |          12 | December     | Online                |  1600 |

### Seasonality

The `avg_revenue` has the revenue for a calendar month, averaged across all years in which the month had at least one booking present in the data.

`June` had the highest average revenue at $1,456,331.11


| month_name   |   month_num |   avg_revenue |
|:-------------|------------:|--------------:|
| January      |           1 |    303,082.56 |
| February     |           2 |    584,784.74 |
| March        |           3 |    965,097.30 |
| April        |           4 |  1,184,618.46 |
| May          |           5 |  1,286,978.29 |
| June         |           6 |  1,456,331.11 |
| July         |           7 |  1,102,672.82 |
| August       |           8 |  1,440,429.74 |
| September    |           9 |  1,343,071.81 |
| October      |          10 |  1,168,478.19 |
| November     |          11 |    604,558.15 |
| December     |          12 |    668,615.08 |


