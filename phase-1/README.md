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

The EDA was done inside of a Python notebook that can be viewed [here](/phase-1/eda/).

From the analysis, we gather that both datasets contain reservations for hotels/lodging.

`customer-reservations.csv` (hence CR) has 36,275 reservations and `hotel-booking.csv` (hence HB) contains 78,703 reservations.


Whereas CR has no detected null values, making the data to appear fully populated, HB had 405 null values, all within the country column.
Taken together, the data appear to be in good shape with almost all values accounted for.

From both CR and HB, it appears that arrivals occur about evenly throughout each month,
but for both do the histograms reveal that there is an uptick in resevations in some of the latter months.


## Dataset Processing

## Presentation