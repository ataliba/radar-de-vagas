class AddStatusToVagas < ActiveRecord::Migration[8.1]
  def change
    add_column :vagas, :status, :string, null: false, default: "detectado"
    add_index :vagas, :status
  end
end
