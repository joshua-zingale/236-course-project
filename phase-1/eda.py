import typing as t
from pyspark.sql import DataFrame, functions


def unique_set(df: DataFrame, column_name: str, max_unique: int = 10) -> t.Mapping[int | float | str, int] | int:
    """Returns a mapping of all unique values in a column to their frequencies in the data
    if the number of unique values is less than max_unique;
    otherwise returns the number of unique values."""

    num_unique = df.select(functions.countDistinct(column_name)).collect()[0][0]
    assert isinstance(num_unique, int)

    if num_unique <= max_unique:
        return {row[column_name]: row['count'] for row in df.groupBy(column_name).count().orderBy(column_name).collect()}

    return num_unique

def print_uniqe_per_column(df: DataFrame, max_unique: int = 10):
    """Prints the unique values for each column"""
    table = Table("Column", f"Unique Values and Their Frequencies (or the number of unique values for columns with more than {max_unique} values)")
    for column_name in df.columns:
        unique = unique_set(df, column_name, max_unique=max_unique)
        table.add_row(column_name, str(unique))

    table.print()
    
    

def print_num_null_per_column(df: DataFrame):
    """Print a table that shows the number of null values in each column."""
    table = Table("Column", "Number of Nulls")
    for column_name in df.columns:
        num_null = df.filter(df[column_name].isNull()).count()
        table.add_row(column_name, str(num_null))

    table.print()


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
        
        return "\n".join([
            format_row(tuple(self._column_names)),
            "-" * (sum(column_widths) - extra_space),
            *map(format_row, self._rows)
        ])

    def print(self, extra_space: int = 4):
        """Print the table to standard output."""
        print(self.as_str(extra_space=extra_space))

    def __str__(self):
        return self.as_str()