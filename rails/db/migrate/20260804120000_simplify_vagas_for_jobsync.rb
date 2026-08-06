class SimplifyVagasForJobsync < ActiveRecord::Migration[8.1]
  def change
    drop_table :match_scores do |t|
      t.bigint "vaga_id", null: false
      t.string "profile_content_hash"
      t.integer "score"
      t.text "motivo"
      t.string "status"
      t.timestamps
    end

    drop_table :profiles do |t|
      t.string "content_hash"
      t.text "markdown_content"
      t.timestamps
    end

    add_column :vagas, :jobsync_job_id, :string
    add_column :vagas, :enviado_em, :datetime

    up_only do
      execute "UPDATE vagas SET status = 'detectado' WHERE status NOT IN ('detectado', 'enviada')"
    end
  end
end
