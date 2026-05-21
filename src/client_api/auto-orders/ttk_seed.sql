-- Создание таблицы sku_ttk
CREATE TABLE IF NOT EXISTS sku_ttk (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    address_code VARCHAR(10) NULL DEFAULT NULL,
    drink_code   VARCHAR(50) NOT NULL,
    sku_id       INT NOT NULL,
    coeff        FLOAT NOT NULL,
    UNIQUE KEY uk_sku_ttk (address_code, drink_code, sku_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Глобальные коэффициенты (address_code = NULL)
INSERT INTO sku_ttk (address_code, drink_code, sku_id, coeff) VALUES
-- co_mi02: Кофе с молоком 200мл
(NULL, 'co_mi02', 0,  0.014),
(NULL, 'co_mi02', 1,  0.120),
(NULL, 'co_mi02', 3,  0.05),
(NULL, 'co_mi02', 6,  0.007692),
(NULL, 'co_mi02', 8,  0.0025),
(NULL, 'co_mi02', 9,  0.002),
(NULL, 'co_mi02', 10, 0.005),
-- ca02: Капучино 0.2
(NULL, 'ca02', 0,  0.012),
(NULL, 'ca02', 1,  0.130),
(NULL, 'ca02', 3,  0.05),
(NULL, 'ca02', 6,  0.007692),
(NULL, 'ca02', 8,  0.0025),
(NULL, 'ca02', 9,  0.002),
(NULL, 'ca02', 10, 0.005),
-- ca03: Капучино 0.3
(NULL, 'ca03', 0,  0.0135),
(NULL, 'ca03', 1,  0.185),
(NULL, 'ca03', 5,  0.05),
(NULL, 'ca03', 7,  0.007692),
(NULL, 'ca03', 8,  0.002667),
(NULL, 'ca03', 9,  0.002),
(NULL, 'ca03', 10, 0.010),
-- ca04: Капучино 0.4
(NULL, 'ca04', 0,  0.015),
(NULL, 'ca04', 1,  0.270),
(NULL, 'ca04', 5,  0.05),
(NULL, 'ca04', 7,  0.007692),
(NULL, 'ca04', 8,  0.002857),
(NULL, 'ca04', 9,  0.002),
(NULL, 'ca04', 10, 0.010),
-- ca_w: Капучино сотрудники
(NULL, 'ca_w', 0,  0.012),
(NULL, 'ca_w', 1,  0.130),
(NULL, 'ca_w', 5,  0.05),
(NULL, 'ca_w', 7,  0.007692),
(NULL, 'ca_w', 8,  0.002857),
(NULL, 'ca_w', 9,  0.002),
(NULL, 'ca_w', 10, 0.010),
-- la02: Латте 0.2
(NULL, 'la02', 0,  0.008),
(NULL, 'la02', 1,  0.140),
(NULL, 'la02', 3,  0.05),
(NULL, 'la02', 6,  0.007692),
(NULL, 'la02', 8,  0.0025),
(NULL, 'la02', 9,  0.002),
(NULL, 'la02', 10, 0.005),
-- la03: Латте 0.3
(NULL, 'la03', 0,  0.010),
(NULL, 'la03', 1,  0.210),
(NULL, 'la03', 5,  0.05),
(NULL, 'la03', 7,  0.007692),
(NULL, 'la03', 8,  0.002667),
(NULL, 'la03', 9,  0.002),
(NULL, 'la03', 10, 0.005),
-- la04: Латте 0.4
(NULL, 'la04', 0,  0.0115),
(NULL, 'la04', 1,  0.280),
(NULL, 'la04', 5,  0.05),
(NULL, 'la04', 7,  0.007692),
(NULL, 'la04', 8,  0.002857),
(NULL, 'la04', 9,  0.002),
(NULL, 'la04', 10, 0.010),
-- ess: Эспрессо
(NULL, 'ess', 0,  0.015),
(NULL, 'ess', 2,  0.04),
(NULL, 'ess', 8,  0.0025),
(NULL, 'ess', 10, 0.005),
-- am02: Американо 0.2
(NULL, 'am02', 0,  0.014),
(NULL, 'am02', 3,  0.05),
(NULL, 'am02', 6,  0.007692),
(NULL, 'am02', 8,  0.0025),
(NULL, 'am02', 10, 0.005),
-- am03: Американо 0.3
(NULL, 'am03', 0,  0.015),
(NULL, 'am03', 5,  0.05),
(NULL, 'am03', 7,  0.007692),
(NULL, 'am03', 8,  0.002667),
(NULL, 'am03', 10, 0.005),
-- am_w: Американо сотрудники
(NULL, 'am_w', 0,  0.015),
(NULL, 'am_w', 5,  0.05),
(NULL, 'am_w', 7,  0.007692),
(NULL, 'am_w', 8,  0.002857),
(NULL, 'am_w', 10, 0.010),
-- te03: Чай 0.3
(NULL, 'te03', 5,  0.05),
(NULL, 'te03', 7,  0.007692),
(NULL, 'te03', 8,  0.003077),
(NULL, 'te03', 10, 0.005)
ON DUPLICATE KEY UPDATE coeff = VALUES(coeff);
