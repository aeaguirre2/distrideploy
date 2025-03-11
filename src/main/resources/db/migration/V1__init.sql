-- Tabla de usuarios
CREATE TABLE usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL,
    activo BOOLEAN DEFAULT true,
    bloqueado BOOLEAN DEFAULT false
);

-- Tabla de autos
CREATE TABLE autos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INTEGER NOT NULL,
    descripcion TEXT,
    precio_base DECIMAL(10,2) NOT NULL,
    vendido BOOLEAN DEFAULT false,
    en_subasta BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    vendedor_id BIGINT,
    comprador_id BIGINT,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id)
);

-- Tabla de subastas
CREATE TABLE subastas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    activa BOOLEAN DEFAULT true,
    cancelada BOOLEAN DEFAULT false,
    finalizada BOOLEAN DEFAULT false,
    precio_actual DECIMAL(10,2),
    precio_minimo DECIMAL(10,2),
    vendedor_id BIGINT,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

-- Tabla intermedia auto_subasta
CREATE TABLE auto_subasta (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    auto_id BIGINT,
    subasta_id BIGINT,
    comprador_id BIGINT,
    precio_final DECIMAL(10,2),
    vendido BOOLEAN DEFAULT false,
    FOREIGN KEY (auto_id) REFERENCES autos(id),
    FOREIGN KEY (subasta_id) REFERENCES subastas(id),
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id)
);

-- Tabla de pujas
CREATE TABLE pujas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    auto_subasta_id BIGINT,
    comprador_id BIGINT,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATETIME NOT NULL,
    ganadora BOOLEAN DEFAULT false,
    FOREIGN KEY (auto_subasta_id) REFERENCES auto_subasta(id),
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id)
); 