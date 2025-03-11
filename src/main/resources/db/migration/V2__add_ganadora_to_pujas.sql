-- Agregar columna ganadora a la tabla pujas si no existe
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS ganadora BOOLEAN DEFAULT false;

-- Actualizar registros existentes
UPDATE pujas SET ganadora = false WHERE ganadora IS NULL; 