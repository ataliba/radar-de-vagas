# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_14_130000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "empresa_alvos", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "empresa", null: false
    t.datetime "updated_at", null: false
    t.index ["empresa"], name: "index_empresa_alvos_on_empresa", unique: true
  end

  create_table "empresa_novas", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "empresa"
    t.datetime "updated_at", null: false
    t.string "url"
    t.integer "vagas_total"
    t.index ["empresa"], name: "index_empresa_novas_on_empresa", unique: true
  end

  create_table "kanban_colunas", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "encerra", default: false, null: false
    t.string "nome", null: false
    t.integer "posicao", null: false
    t.datetime "updated_at", null: false
  end

  create_table "presencas", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "empresa"
    t.string "gupy"
    t.string "gupy_url"
    t.string "inhire"
    t.string "inhire_url"
    t.integer "inhire_vagas_total"
    t.string "solides"
    t.integer "solides_vagas"
    t.datetime "updated_at", null: false
    t.index ["empresa"], name: "index_presencas_on_empresa", unique: true
  end

  create_table "termos_busca", force: :cascade do |t|
    t.boolean "ativo", default: false, null: false
    t.datetime "created_at", null: false
    t.string "origem", null: false
    t.string "rotulo", null: false
    t.string "termo", null: false
    t.datetime "updated_at", null: false
    t.index ["termo", "origem"], name: "index_termos_busca_on_termo_and_origem", unique: true
  end

  create_table "vaga_eventos", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "de_coluna"
    t.string "para_coluna"
    t.string "tipo", null: false
    t.bigint "vaga_id", null: false
    t.index ["vaga_id"], name: "index_vaga_eventos_on_vaga_id"
  end

  create_table "vagas", force: :cascade do |t|
    t.string "alerta"
    t.string "cargo_categoria"
    t.datetime "created_at", null: false
    t.datetime "descontinuada_em"
    t.date "detectado_em"
    t.string "empresa"
    t.datetime "enviado_em"
    t.string "id_externo"
    t.string "jobsync_job_id"
    t.bigint "kanban_coluna_id"
    t.string "link"
    t.string "local"
    t.string "na_lista"
    t.string "nome_na_plataforma"
    t.string "plataforma"
    t.datetime "publicado"
    t.string "status", default: "detectado", null: false
    t.string "tipo"
    t.string "titulo_vaga"
    t.datetime "updated_at", null: false
    t.index ["cargo_categoria"], name: "index_vagas_on_cargo_categoria"
    t.index ["kanban_coluna_id"], name: "index_vagas_on_kanban_coluna_id"
    t.index ["link"], name: "index_vagas_on_link", unique: true
    t.index ["na_lista"], name: "index_vagas_on_na_lista"
    t.index ["plataforma", "id_externo"], name: "index_vagas_on_plataforma_and_id_externo", unique: true, where: "(id_externo IS NOT NULL)"
    t.index ["plataforma"], name: "index_vagas_on_plataforma"
    t.index ["status"], name: "index_vagas_on_status"
  end

  add_foreign_key "vaga_eventos", "vagas", on_delete: :cascade
  add_foreign_key "vagas", "kanban_colunas", on_delete: :nullify
end
