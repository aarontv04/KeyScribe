/*
  # Create music analyses table

  1. New Tables
    - `music_analyses`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `tempo` (integer)
      - `key` (text)
      - `time_signature` (text)
      - `notes` (jsonb)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `music_analyses` table
    - Add policies for authenticated users to:
      - Create their own analyses
      - Read their own analyses
      - Update their own analyses
      - Delete their own analyses
*/

CREATE TABLE IF NOT EXISTS music_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  tempo integer NOT NULL,
  key text NOT NULL,
  time_signature text NOT NULL,
  notes jsonb NOT NULL,
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE music_analyses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own analyses"
  ON music_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own analyses"
  ON music_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON music_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON music_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);