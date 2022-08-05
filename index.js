const express = require('express')
const db = require('./connection/dataBase')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const upload = require('./middlewares/upload')
const app = express()

const port = 8000
app.set('view engine', 'hbs')
app.use(express.urlencoded({extended:false}))
app.use('/public', express.static('public'))
app.use('/files', express.static('files'))

const login = true

app.use(flash())

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }
}))

/* Testing db connection */
db.connect((err, _, done) => {
    if(err){
        return console.log(err)
    }
    console.log('Database connection success')
    done()
})

app.listen(port, function(){
    console.log(`Server running on port : ${port}`)
})

/* ROUTING */

app.get('/home', (req, res) => {
    db.connect((err, client, done) => {
        if(err){
            return console.log(err);
        }

        const query = `SELECT tb_projects.*, tb_user.name, tb_user.email 
                    FROM tb_projects LEFT JOIN tb_user 
                    ON tb_user.id = tb_projects.user_id 
                    ORDER BY tb_projects.id DESC;
        `

        client.query(query, (err, result) => {
            if (err) throw err

            const data = result.rows
            const path = 'http://localhost:8000/files/'

            const project = data.map((projects) => {
                const dataProject = {
                    ...projects,
                    startDate : new Date(projects.startDate),
                    endDate : new Date(projects.endDate),
                    duration: getDuration(projects.startDate, projects.endDate),
                    login: req.session.login,
                    technologies: projects.technologies[0],
                    image: path + projects.image
                }
                console.log(dataProject)
                return dataProject
            })  

            res.render('index', {user: req.session.user, dataProjects: project, login: req.session.login})

        })
        done()
    })

})

app.get('/contact', (req, res) => {
    res.render('contact', {user: req.session.user, login: req.session.login})
})

app.get('/project', (req, res) => {

    if(req.session.login != true){
        return res.redirect('/login')
    }

    res.render('project', {user: req.session.user, login: req.session.login})
})

app.post('/project', upload.single('image'), (req, res) => {
    const {
        title, 
        startDate, 
        endDate,
        description, 
        python, 
        javascript,
        swift,
        nodejs
    } = req.body

    const fileName = req.file.filename

    db.connect((err, client, done) => {
        if(err) throw err

        const query = `INSERT INTO public.tb_projects(title, "startDate", "endDate", description, technologies, image) VALUES ('${title}', '${startDate}', '${endDate}', '${description}', '{${python}, ${javascript}, ${swift}, ${nodejs}}', '${fileName}')`

        client.query(query, (err) => {
            if(err) throw err
            done()
            res.redirect('/home')
        })
    })
})

app.get('/detail-project/:id', (req, res) => {
    const id = req.params.id
    
    db.connect((err, client, done) => {
        if(err) throw err

        const query = `SELECT * FROM tb_projects WHERE id=${id}`

        client.query(query, (err, result) => {
            if(err) throw err
            done()

            let project = result.rows[0]

            project.startDate = new Date(project.startDate)
            project.endDate = new Date(project.endDate)
            project.duration = getDuration(project.startDate, project.endDate)
            project.startDate = getFullTime(project.startDate)
            project.endDate = getFullTime(project.endDate)

            res.render('detailProject', { project , user: req.session.user, login: req.session.login})
        })
    })
})

app.get('/delete/:id', (req, res) => {
    const id = req.params.id

    db.connect((err, client, done) => {
        if(err) throw err
        const query = `DELETE FROM public.tb_projects WHERE id=${id};`

        client.query(query, (err) => {
            if(err) throw err
            done()
            res.redirect('/home')
        })
    })
})

/* Edit & Project */

app.get('/edit-project/:id', (req, res) => {
    const id = req.params.id

    db.connect((err, client, done) => {
        if(err) throw err
        const query = `SELECT * FROM tb_projects WHERE id=${id}`

        client.query(query, (err, result) => {
            if (err) throw err

            const project = result.rows[0]
            res.render('editProject', { projectData: { ...project, id }})
        })
    })
})

app.post('/edit-project/:id', (req, res) => {
    const id = req.params.id
    const {title, 
        startDate, 
        endDate, 
        description, 
        python, 
        javascript,
        swift,
        nodejs,
        image
        } = req.body

    db.connect((err, client, done) => {
        if(err) throw err
        const query = `UPDATE tb_projects SET 
                        title='${title}', "startDate"='${startDate}', "endDate"='${endDate}', description='${description}', technologies='{${python}, ${javascript}, ${swift}, ${nodejs}}', image='${image}' 
                        WHERE id=${id}`
        client.query(query, (err) => {
            if(err) throw err
            done()
            res.redirect('/home')
        })
    })
})

/* Edit & Project */

/* Login & Register */
app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
    const { email, password} = req.body

    if(!email || !password){
        req.flash('Warning', 'please fill all the documents!!!')
        return(res.redirect('/login'))
    }

    db.connect((err, client, done) =>  {
        if(err) throw err
        const query = `SELECT * FROM tb_user WHERE email = '${email}'`

        client.query(query, (err, result) => {
            if(err) throw err

            const data = result.rows

            if(data.length == 0){
                console.log(`Email ${email} does not exist!!!`)
                return res.redirect('/login')
            }

            const passMatch = bcrypt.compareSync(password, data[0].password)

            if(passMatch == false){
                console.log('Password wrong!!1')
                return res.redirect('/login')
            }

            req.session.login = true
            req.session.user = {
                id: data[0].id,
                email: data[0].email,
                name: data[0].name
            }

            res.redirect('/home')
        })
    })
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', (req, res) => {
    const {name, email, password} = req.body
    const hashing = bcrypt.hashSync(password, 10)

    db.connect((err, client, done) => {
        if(err) throw err
        const query = `INSERT INTO tb_user(name, email, password) VALUES ('${name}', '${email}', '${hashing}')`

        client.query(query, (err) => {
            if(err) throw err
        })

        done()
        console.log(`Email ${email}, has been registered`)
        res.redirect('/login')
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/home')
})
/* Login & Register */

/* ROUTING */

function getDuration(start, end){

    let startDate = start
    let endDate = end

    if(startDate > endDate){
        return alert("Error! The value of start date cannot be bigger than the end date!!")
    }

    let time = new Date(endDate - startDate)

    let miliSecond = 1000
    let secondInHour = 3600
    let hourInDay = 24
    let dayInMonth = 31
    let monthInYear = 12

    let day = Math.floor(time / (miliSecond * secondInHour * hourInDay))
    let month = Math.floor(day / dayInMonth)
    let year = Math.floor(month / monthInYear)

    if(month <= 0){
        let duration = day + " Days" 
        return(duration)
    } else if(year <= 0){
        let duration = month + " Months"
        return(duration)
    } else if(year >= 0){
        let duration = year + " Years"
        return(duration)
    }
}

function getFullTime(time) {

    let month = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ]

    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()

    let result = `${date} ${month[monthIndex]} ${year}`

    return result;
}