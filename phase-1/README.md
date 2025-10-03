# Phase 1: Data Preparation & EDA in Spark

## Installation

### Docker
Docker was installed using [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).

The following command and output verified its installation: 

```bash
$ docker --version
Docker version 28.3.2, build 578ccf6
```

### Python Dependencies

This project uses [uv](https://docs.astral.sh/uv/) to manage its Python dependencies.

Afert initializing the project with

```bash
uv init --python 3.13
```
we added our requirements with

```bash
uv add pyspark jupyterlab plotly pandas
```


## Exploratory Data Analysis (EDA)

The EDA was done inside of a Python notebook that can be viewed [here](eda/).
The notebook contains some histograms generated from various fields of the data.

From the analysis, we gather that both datasets contain reservations for hotels/lodging.

`customer-reservations.csv` (hence CR) has 36,275 reservations and `hotel-booking.csv` (hence HB) contains 78,703 reservations.

Some basic statistics for CR:

| summary   | Booking_ID   |   stays_in_weekend_nights |   stays_in_week_nights |   lead_time |   arrival_year |   arrival_month |   arrival_date | market_segment_type   |   avg_price_per_room | booking_status   |
|:----------|:-------------|--------------------------:|-----------------------:|------------:|---------------:|----------------:|---------------:|:----------------------|---------------------:|:-----------------|
| count     | 36275        |              36275        |             36275      |  36275      |   36275        |     36275       |    36275       | 36275                 |           36275      | 36275            |
| mean      |              |                  0.810724 |                 2.2043 |     85.2326 |    2017.82     |         7.42365 |       15.597   |                       |             103.424  |                  |
| stddev    |              |                  0.870644 |                 1.4109 |     85.9308 |       0.383836 |         3.06989 |        8.74045 |                       |              35.0894 |                  |
| min       | INN00001     |                  0        |                 0      |      0      |    2017        |         1       |        1       | Aviation              |               0      | Canceled         |
| max       | INN36275     |                  7        |                17      |    443      |    2018        |        12       |       31       | Online                |             540      | Not_Canceled     |

Some basic statistics for HB:

| summary   | hotel        |   booking_status |   lead_time |   arrival_year | arrival_month   |   arrival_date_week_number |   arrival_date_day_of_month |   stays_in_weekend_nights |   stays_in_week_nights | market_segment_type   | country   |   avg_price_per_room | email                     |
|:----------|:-------------|-----------------:|------------:|---------------:|:----------------|---------------------------:|----------------------------:|--------------------------:|-----------------------:|:----------------------|:----------|---------------------:|:--------------------------|
| count     | 78703        |     78703        |   78703     |   78703        | 78703           |                 78703      |                 78703       |              78703        |            78703       | 78703                 | 78298     |           78703      | 78703                     |
| mean      |              |         0.361854 |     101.298 |    2015.72     |                 |                    31.5774 |                    15.8399  |                  0.903968 |                2.44796 |                       |           |              95.2104 |                           |
| stddev    |              |         0.48054  |     106.201 |       0.448747 |                 |                    13.333  |                     8.77605 |                  0.989566 |                1.87166 |                       |           |              48.3099 |                           |
| min       | City Hotel   |         0        |       0     |    2015        | April           |                     1      |                     1       |                  0        |                0       | Aviation              | ABW       |               0      | AAdams40@xfinity.com      |
| max       | Resort Hotel |         1        |     737     |    2016        | September       |                    53      |                    31       |                 19        |               50       | Undefined             | ZWE       |            5400      | Zuniga_Thomas@outlook.com |


Whereas CR has no detected null values, making the data to appear fully populated, HB had 405 null values, all within the country column.
Taken together, the data appear to be in good shape with almost all values accounted for.

From both CR and HB, it appears that arrivals occur about evenly throughout each month,
but for both do the histograms reveal that there is an uptick in reservations in some of the latter months.


## Dataset Processing

## Presentation