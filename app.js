const express = require('express');
const { Pool } = require('pg');

// pg connect
const pool = new Pool({
    user: 'postgres',
    database: '9.17_project_final',
    password: 'admin',
    port: 5432,
    host: 'localhost',
    max: 50,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0
});

pool.connect((err) => {
    err ? console.log("Connection error: ", err.stack) : console.log("Connected to db!");
});

// express app
const app = express();

// for static files
app.use(express.static('static'));

// listen for requests
app.listen(3000);

// register view engine
app.set('view engine', 'ejs');

// for POST request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// main page
app.get('/', (req, res) => {
    res.render('main', { root: __dirname });
});

// admin page
app.get('/admin', (req, res) => {
    res.render('admin.ejs', { root: __dirname });
});

app.get('/admin/student', (req, res) => {
    res.render('admin_student.ejs', { root: __dirname });
});

app.get('/admin/professor', (req, res) => {
    res.render('admin_professor.ejs', { root: __dirname });
});

app.post('/admin/student', (req, res) => {
    let student_id = req.body.student_id;
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    (async function() {
        try
        {
            let rep = await pool.query(`SELECT * FROM student where student_id = '${student_id}'`);
            if(rep.rows.length != 0)
            {
                throw "Student ID is already inserted.";
            }
            pool.query(`INSERT INTO student(student_id, first_name, last_name) VALUES ('${student_id}', '${first_name}', '${last_name}')`);
            res.status(201).json({ err: '' });
        }
        catch(err)
        {
            res.status(201).json({err: err});
        }
    })();
});

app.post('/admin/professor', (req, res) => {
    let professor_id = req.body.professor_id;
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let course_id = req.body.course_id;
    (async function() {
        try
        {
            let rep = await pool.query(`SELECT * FROM professor where professor_id = '${professor_id}'`);
            console.log(rep.rows.length);
            if(rep.rows.length != 0)
            {
                throw "Professor ID is already inserted.";
            }
            pool.query(`INSERT INTO professor(professor_id, first_name, last_name, course_id) VALUES ('${professor_id}', '${first_name}', '${last_name}', '${course_id}')`);
            res.status(201).json({ err: '' });
        }
        catch(err)
        {
            res.status(201).json({err: err});
        }
    })();
});

// professor page

app.get('/professor', (req, res) => {
    res.render('professor.ejs', { root: __dirname });
});

app.get('/professor/:exam', (req, res) => {
    let exam = req.params.exam;
    let send = {
        exam: exam
    }
    send = JSON.stringify(send);
    res.render('professor_exam.ejs', {send: send});
});

app.post('/professor/:exam', (req, res) => {
    let exam = req.params.exam;
    let student_id = req.body.student_id;
    let course_id = req.body.course_id;
    let marks = req.body.marks;
    marks = Number.parseInt(marks);
    (async function() {
        try
        {
            let rep = await pool.query(`SELECT * FROM student where student_id = '${student_id}'`);
            if(rep.rows.length == 0)
            {
                throw "Student ID doesn't exist...";
            }
            else
            {
                rep = await pool.query(`SELECT * FROM professor where course_id = '${course_id}'`);
                if(rep.rows.length == 0)
                {
                    throw "Course ID doesn't exist...";
                }
            }
            await pool.query(`DELETE FROM "${exam}" WHERE course_id = '${course_id}' AND student_id = '${student_id}'`);
            await pool.query(`INSERT INTO "${exam}"(student_id, course_id, marks) VALUES ('${student_id}', '${course_id}', ${marks})`);
            res.status(201).json({ err: '' });
        }
        catch(err)
        {
            res.status(201).json({err: err});
        }
    })();
});

let ret = [];
let student_err = "";

app.get('/student', (req, res) => {
    res.render('student.ejs', { root: __dirname, ret: ret, err : student_err });
    ret = [];
    student_err = "";
});

app.post('/student', (req, res) => {
    let student_id = req.body.student_id;
    (async function() {
        try
        {
            let rep = await pool.query(`SELECT * FROM student where student_id = '${student_id}'`);
            if(rep.rows.length == 0)
            {
                throw "Student ID doesn't exist...";
            }
            rep = await pool.query(`SELECT DISTINCT(course_id) FROM professor`);
            courses = new Set();
            rep = rep.rows;
            for(let i=0; i<rep.length; i++)
            {
                courses.add(rep[i].course_id);
            }
            ret = [];
            student_err = "";
            courses = [...courses];
            for(let i=0; i<courses.length; i++)
            {
                let element = courses[i];
                let obj = {
                    course_id: element,
                    insem1_marks: '-',
                    insem2_marks: '-',
                    endsem_marks: '-'
                }
                rep = await pool.query(`SELECT marks FROM insem1 where course_id = '${element}' AND student_id = '${student_id}'`);
                if(rep.rows.length > 0)
                {
                    obj.insem1_marks = rep.rows[0].marks;
                }
                rep = await pool.query(`SELECT marks FROM insem2 where course_id = '${element}' AND student_id = '${student_id}'`);
                if(rep.rows.length > 0)
                {
                    obj.insem2_marks = rep.rows[0].marks;
                }
                rep = await pool.query(`SELECT marks FROM endsem where course_id = '${element}' AND student_id = '${student_id}'`);
                if(rep.rows.length > 0)
                {
                    obj.endsem_marks = rep.rows[0].marks;
                }
                ret.push(obj);
            }
            res.status(201).json({temp: true});
        }
        catch(err)
        {
            ret = [];
            student_err = err;
            res.status(201).json({temp: true});
        }
    })();
});

// 404 page
app.use((req, res) => {
    res.send('404! Page Not Found...');
});