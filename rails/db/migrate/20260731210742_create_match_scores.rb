class CreateMatchScores < ActiveRecord::Migration[8.1]
  def change
    create_table :match_scores do |t|
      t.references :vaga, null: false, foreign_key: true
      t.string :profile_content_hash
      t.integer :score
      t.text :motivo
      t.string :status

      t.timestamps
    end

    add_index :match_scores, [ :vaga_id, :profile_content_hash ], unique: true, name: "index_match_scores_on_vaga_and_profile_hash"
  end
end
