class CreateEmpresaNovas < ActiveRecord::Migration[8.1]
  def change
    create_table :empresa_novas do |t|
      t.string :empresa
      t.integer :vagas_total
      t.string :url

      t.timestamps
    end

    add_index :empresa_novas, :empresa, unique: true
  end
end
