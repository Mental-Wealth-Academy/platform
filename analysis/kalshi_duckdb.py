import duckdb
import sys

def main():
    print("Connecting and loading data...")
    con = duckdb.connect()

    # Create table from CSV
    try:
        con.execute("""
            CREATE TABLE d AS 
            SELECT * FROM read_csv_auto('data/kalshi-snapshots.csv', header=True)
        """)
    except Exception as e:
        print(f"Error loading CSV: {e}")
        sys.exit(1)

    row_count = con.execute('SELECT COUNT(*) FROM d').fetchone()[0]
    snap_count = con.execute('SELECT COUNT(DISTINCT ts) FROM d').fetchone()[0]
    
    print(f"Loaded {row_count} rows across {snap_count} snapshots")

    print("\n--- Score by category (scored markets only) ---")
    con.sql("""
        SELECT 
            category,
            ROUND(AVG(score), 4) as avg_score,
            MEDIAN(score) as med_score,
            COUNT(*) as count_markets
        FROM d
        WHERE score > 0
        GROUP BY category
    """).show()

    print("\n--- Avg bid-ask spread by category ---")
    con.sql("""
        SELECT 
            category,
            ROUND(AVG(yes_ask - yes_bid), 4) as avg_spread
        FROM d
        WHERE score > 0
        GROUP BY category
    """).show()

    print("\n--- Score filter rate by day ---")
    con.sql("""
        SELECT 
            CAST(ts AS DATE) as day,
            COUNT(*) as total,
            CAST(SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) AS INT) as scored,
            ROUND(SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) as pct_pass
        FROM d
        GROUP BY CAST(ts AS DATE)
        ORDER BY day
    """).show()

    print("\n--- Top 10 markets by avg 24h volume ---")
    con.sql("""
        SELECT 
            ticker,
            ROUND(AVG(volume_24h), 2) as avg_vol24,
            ANY_VALUE(category) as category,
            ANY_VALUE(event_ticker) as event_ticker
        FROM d
        GROUP BY ticker
        ORDER BY avg_vol24 DESC
        LIMIT 10
    """).show()

    print("\n--- Top 10 most contested markets ---")
    con.sql("""
        SELECT 
            ticker,
            ROUND(STDDEV_POP(yes_ask), 4) as stddev_ask,
            ANY_VALUE(category) as category,
            COUNT(*) as snapshots
        FROM d
        WHERE score > 0
        GROUP BY ticker
        ORDER BY stddev_ask DESC
        LIMIT 10
    """).show()

    print("\n--- Drifting markets (last 24h, move >= 0.05, signal/noise >= 1.5) ---")
    con.sql("""
        WITH recent AS (
            SELECT *
            FROM d
            WHERE ts >= (SELECT MAX(ts) - INTERVAL 24 HOUR FROM d)
              AND score > 0
        ),
        drifts AS (
            SELECT 
                ticker,
                ANY_VALUE(category) as category,
                COUNT(*) as snapshots,
                STDDEV_POP(yes_ask) as stddev_ask,
                arg_min(yes_ask, ts) as first_ask,
                arg_max(yes_ask, ts) as last_ask
            FROM recent
            GROUP BY ticker
        )
        SELECT 
            ticker,
            category,
            ROUND(last_ask - first_ask, 4) as net_move,
            ROUND(first_ask, 4) as first_ask,
            ROUND(last_ask, 4) as last_ask,
            ROUND(ABS(last_ask - first_ask) / GREATEST(stddev_ask, 0.001), 4) as snr
        FROM drifts
        WHERE snapshots > 3 
          AND ABS(last_ask - first_ask) >= 0.05
          AND ABS(last_ask - first_ask) / GREATEST(stddev_ask, 0.001) >= 1.5
        ORDER BY net_move DESC
    """).show()

if __name__ == "__main__":
    main()
