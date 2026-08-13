-- Add production_date column with a fallback default value first
ALTER TABLE album_covers ADD COLUMN production_date TEXT NOT NULL DEFAULT '2000-01-01';

-- Populate the user-supplied release dates matching existing sort_order values in a single UPDATE query
UPDATE album_covers 
SET production_date = CASE sort_order
  WHEN 0 THEN '1999-01-01'
  WHEN 1 THEN '2002-01-01'
  WHEN 2 THEN '2004-01-01'
  WHEN 3 THEN '2006-01-01'
  WHEN 4 THEN '2008-01-01'
  WHEN 5 THEN '2009-01-01'
  WHEN 6 THEN '2009-06-01'
  WHEN 7 THEN '2012-01-01'
  WHEN 8 THEN '2013-01-01'
  WHEN 9 THEN '2014-01-01'
  WHEN 10 THEN '2015-01-01'
  WHEN 11 THEN '2022-01-01'
  ELSE production_date
END
WHERE sort_order BETWEEN 0 AND 11;

-- Drop the old sort_order column
ALTER TABLE album_covers DROP COLUMN sort_order;
