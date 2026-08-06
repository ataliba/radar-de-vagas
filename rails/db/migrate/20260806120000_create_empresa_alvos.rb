class CreateEmpresaAlvos < ActiveRecord::Migration[8.1]
  def up
    create_table :empresa_alvos do |t|
      t.string :empresa, null: false

      t.timestamps
    end
    add_index :empresa_alvos, :empresa, unique: true

    seed_empresas_iniciais
  end

  def down
    drop_table :empresa_alvos
  end

  private

  # Popula a lista-alvo com o que já estava em empresas.xlsx (extraído em
  # db/seed_data/empresas_iniciais.json) — ponto de partida pra tela de
  # gerenciamento, sem perder o que já era rastreado pelo scraper.
  def seed_empresas_iniciais
    empresas = JSON.parse(File.read(Rails.root.join("db/seed_data/empresas_iniciais.json")))
    now = Time.current

    values = empresas.map { |nome| "(#{quote(nome)}, #{quote(now)}, #{quote(now)})" }.join(",\n")
    execute("INSERT INTO empresa_alvos (empresa, created_at, updated_at) VALUES #{values}")
  end
end
