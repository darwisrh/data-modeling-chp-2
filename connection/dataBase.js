const { pool, Pool } = require('pg')

const dbPool = new Pool({
    database: 'darwisrh_b38_datab',
    port: '2003',
    user: 'postgres',
    password: 'darwis2908'
})

module.exports = dbPool