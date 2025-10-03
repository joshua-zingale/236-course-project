from pyspark.sql import DataFrame

def get_common_columns(df1: DataFrame, df2: DataFrame) -> tuple[list[str], list[str]]:
    """Get the names and data types of all columns that both df1 and df2 share.
    A columns is shared between the two dataframes if it has the same name and data type.
    
    :returns: (columns names, column types) 
    """
    columns1 = set(df1.dtypes)
    columns2 = set(df2.dtypes)
    inter = list(columns1.intersection(columns2))
    return list(map(lambda x: x[0], inter)), list(map(lambda x: x[1], inter))

def get_left_unique_columns(df1: DataFrame, df2: DataFrame) -> tuple[list[str], list[str]]:
    """Get the names and data types of all columns that are in df1 and not in df2.
    A columns is shared between the two dataframes if it has the same name and data type.
    
    :returns: (columns names, column types) 
    """
    columns1 = set(df1.dtypes)
    columns2 = set(df2.dtypes)
    inter = list(columns1 - columns2)
    return list(map(lambda x: x[0], inter)), list(map(lambda x: x[1], inter))