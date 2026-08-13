class CreateTermosBusca < ActiveRecord::Migration[8.1]
  def up
    create_table :termos_busca do |t|
      t.string :termo, null: false
      t.string :rotulo, null: false
      t.string :origem, null: false
      t.boolean :ativo, null: false, default: false

      t.timestamps
    end
    add_index :termos_busca, [ :termo, :origem ], unique: true

    seed_presets
  end

  def down
    drop_table :termos_busca
  end

  private

  # Popula os dois presets prontos (devops = escopo atual, dados = escopo
  # original do projeto antes do commit a519a6b) mas só ativa o devops —
  # upgrade transparente, comportamento do scraper não muda.
  def seed_presets
    now = Time.current
    rows = []

    seed_termos("devops", "preset_devops", ativo: true).each { |r| rows << r }
    seed_termos("dados", "preset_dados", ativo: false).each { |r| rows << r }

    values = rows.map { |termo, rotulo, origem, ativo|
      "(#{quote(termo)}, #{quote(rotulo)}, #{quote(origem)}, #{quote(ativo)}, #{quote(now)}, #{quote(now)})"
    }.join(",\n")
    execute("INSERT INTO termos_busca (termo, rotulo, origem, ativo, created_at, updated_at) VALUES #{values}")
  end

  def seed_termos(arquivo, origem, ativo:)
    termos = JSON.parse(File.read(Rails.root.join("db/seed_data/termos_#{arquivo}.json")))
    termos.map { |t| [ t["termo"], t["rotulo"], origem, ativo ] }
  end
end
