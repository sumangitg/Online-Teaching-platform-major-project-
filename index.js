const bodyParser = require('body-parser');
const express=require('express');
const ejs =require('ejs');
const path=require('path');
const mysql=require('mysql2');
const multer =require('multer');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fs= require("fs");



const app=express();

// port of server running
const port=process.env.port || 4500;


// ejs view engine to create dynamic page
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// use body-parser format json data
app.use(bodyParser.urlencoded({extended:false}));   
app.use(bodyParser.json());

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: 'your_secret_key',
    resave: true,
    saveUninitialized: true,
  })
);

// make static folder named public to serve static files
app.use(express.static('public'));

app.use('/public/images', express.static(__dirname + '/public/images'));
app.use('/public/css', express.static(__dirname + '/public/css'));

app.use(express.static(path.join(__dirname, 'uploads')));





// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: './public/images/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});


// Multer Configuration for video upload in uploads folder.
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath);   
      }      
      cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
      cb(null, file.originalname);
  }
});

const upload2 = multer({ storage: storage2 });

// multer for upload image in images folder.
const upload = multer({
  storage: storage,
}).single('image');    // added image instead of courseImage

// for pdf upload
const storage1 = multer.memoryStorage();
const upload1 = multer({ storage: storage1 });



 //courseImage instead of image
// Create MySQL connection   
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'hal987@@@',
  database: 'academicproject'     
});


db.connect(err => {
  if (err) {
    console.error('MySQL connection error: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL as id ' + db.threadId);
});


// teacher view courses
app.get('/teacherviewcourses' ,(req,res)=>{
  res.render('teacherviewcourses');
})

app.get('/uploadnotes', (req, res)=>{
  res.render('uploadnotes');   
})

app.get('/courses', (req,res)=>{
  res.render('courses');
})

app.post('/uploadnotes', (req, res)=>{
 // console.log(req.body);   
  //res.send("selected");
  var courseSection=req.body.notesSection;
 //console.log(courseSection);
  var query='select * from course where courseSection=(?)'

  db.query(query, [courseSection] , (err, result)=>{
    if(err)
    {
      res.json({msg:"not available any course in this course section"});
    }  
    else{
      res.render('uploadnoteswithcourses',{coursesection:courseSection,courseitem:result});  
      //res.redirect('/uploadnoteswithcourses');
      //res.send("catched");
    }
  })
});



//home page
app.get('/' , (req , res)=>{ 
  //console.log(req);
  const sql='select notice from admissionnotice where noticeType=(?)';
  const sql1='select notice from admissionnotice where noticeType=(?)';
  noticetype='latestNews';
  noticetype1='upcomingNews';
  db.query(sql, [noticetype], (err, result1)=>{
    if(err){     
      return console.error('latest notice not available',err);    
    }    
    db.query(sql1, [noticetype1], (err, result2)=>{
      if(err){          
       return  console.error('latest notice not available',err);
      }   

      if(req.session.token){
        let value = req.session.mykey;
        res.render('index', {latest:result1, upcoming:result2 ,users: value}); 
      }else        
        res.render('index', {latest:result1, upcoming:result2 ,users: 0}); 
      
    })
   
  })



})   
  


//login page
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/adminPanel',(req,res)=>{
  res.render('successLogin');    
})
// login page api 
  app.post('/login', (req, res) => {
    const { userName, passw } = req.body;
  
    // Check login credentials
    const query = 'SELECT * FROM teacher WHERE userName = ? AND passw = ?';
    db.query(query, [userName, passw], (err, results) => {     
      if (err) throw err;     
      if (results.length > 0) {
        res.render('successLogin');
      } else {   
        res.render('failLogin');     
      }
    });
  });
  

// add course api

app.get('/addCourse', (req, res) => {
  res.render('addCourse');
});   


app.post('/addCourse', (req, res) => {
 // console.log("IN");
 console.log(req.body);    
  upload(req, res, (err) => {
    // added   
    //console.log(req.body);
    if (err) {  
      res.json({ msg: 'Error: ' + err.message });
    } else {
      const cv={
        courseName,
        courseSection,
        coursePrice,
        coordinator,
        courseTime,
        noteAvalaible,
        videoClasses,
        topics,
      } = req.body;


 //console.log(req.body);


  const imagePath = '/images/' + req.file.filename;


 console.log(imagePath);
      const insertQuery = `
        INSERT INTO course 
        (courseName,courseTime, noteAvalaible, coursePrice, coordinator, videoClasses, topics, imagePath,courseSection)  
        VALUES (?,?,?,?,?,?,?,?,?)
      `;

     // console.log(cv.noteAvalaible);
     // console.log(cv.videoClasses);  
      if(cv.noteAvalaible==='on'){
        cv.noteAvalaible=true;
      }
      else{
        cv.noteAvalaible=false;
      }
      if(cv.videoClasses==='on'){
        cv.videoClasses=true;
      }
      else{
        cv.videoClasses=false;
      }


      const values = [
        cv.courseName,
        cv.courseTime,
        cv.noteAvalaible,   
        cv.coursePrice,
        cv.coordinator,      
        cv.videoClasses,
        cv.topics,
        imagePath,
        courseSection
      ];





      db.query(insertQuery, values, (err, result) => {
        if (err) {
          res.json({ msg: 'Error: Failed to insert into database!' });
        } else {
          res.json({ msg: `Course: ${cv.courseName} added successfully!` });
        }
      });
      
    }
  });
});

// app.get('/uploadnoteswithcourses', (req, res)=>{
//   console.log("hello");
//   res.render('uploadnoteswithcourses');
// })

app.post('/uploadnoteswithcourses',upload1.single('pdfFile'), (req, res)=>{
  //console.log(req);
  //console.log(req.body);  
  //console.log("fuck baby"); 
  var pdfName=req.body.pdfName;
  var pdfData = req.file.buffer;
  var courseName=req.body.courseName;     
  var coursesection=req.body.coursesection; 

  //console.log(pdfName);      
  //console.log(pdfData);
  //console.log(courseName);  
  //console.log(coursesection);    
  var courseid; 
  const sql=`select courseId from course where courseSection=(?) and courseName=(?)`
  db.query(sql, [coursesection, courseName], (err, result)=>{
  if(err){
    //console.log('in error part');
    console.error('courseId not available', err);
    res.status(500).json({message:'course id not available'});

  }else if(result.length===0)
  {
    console.log('not found');
  }
  else{  
    //console.log('in result part');  
    if (result.length > 0) {
      //console.log(result);
      //console.log(result[0]);
      //console.log(result[0].courseId);     
      // Assuming courseId is the column name in your database
      courseid = result[0].courseId;  
      //console.log(courseid);
      const sql1=`insert into notes(courseId, noteName, notePdf) value(?,?,?)`
  db.query(sql1,[courseid, pdfName, pdfData] , (err, result)=>{
  if(err){   
    console.error('mysql insertion error' , err);
    res.status(500).json({msg: 'error to storing PDF in the database.'});
  }
  else{
    //console.log('PDF stored in the database');
    res.json({msg:'PDF successfully uploaded.'});
  }
  });        
  //res.json({ msg: `note added successfully!` });

    } else {
      console.log('in status 404 part');
      console.error('Course not found');
      res.status(404).json({ message: 'Course not found' });
    }

  }
 });



});







app.get('/viewcourses', (req, res) => {
  var name = req.query.name; // Default to 'default' if no name is provided
 console.log('Received name:', name);
 // res.send(`Hello, ${name}!`);
  const selectQuery = 'SELECT * FROM course WHERE courseSection=?';
  db.query(selectQuery,[name], (err, results) => { 
    //added new
    //console.log(results);       
    if (err) {
      res.json({ error: 'Error: Failed to fetch courses from the database!' });
    } else {
      res.render('viewcourse', { courses: results });
    }
  });                         
});                           



app.get('/addGalleryPhoto', (req,res)=>{
  res.render('addgalleryphoto');
})

app.post('/upload',(req,res)=>{
  //console.log("am in");
  //console.log(req);
  upload(req,res, (err)=>{
    if(err){
      //console.log("12");
      res.render('addgalleryphoto' , {msg:err});
    }
    else{
      
      console.log("23");
      if(req.file==undefined){
        console.log(req.file);
        res.render('addgalleryphoto', {msg:'file not selected'});
    }
    else{
      console.log("45");
      const imagePath = '/images/' + req.file.filename;

      //added new
      //console.log(req.file);
      //console.log(req.file.originalname);


     // console.log(imagePath);
      var insertquery='insert into galleryphoto (path) values(?)';

      db.query(insertquery,[imagePath],(err,result)=>{
        if(err){
          throw err;
        }
        else{
          res.json({ msg: `${req.file.originalname} image added successfully!` });
        }
        //res.render('addgalleryphoto' , {msg:'Image Uploaded Successfully.'});
        
      })
    }
  }})
})

app.get('/viewgallery',(req, res)=>{
  var fetchquery='select * from galleryphoto';

  db.query(fetchquery , (err, result)=>{
    res.render('viewgallery' , {galleryphoto:result});
  })
})

app.get('/registration' ,  (req, res)=>{
  res.render('registration');
})

app.get('/giveNotice' , (req, res)=>{
  res.render('writeNotice');
 // res.send('am ready');
 

})


//working in this route


// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.token) {  
    jwt.verify(req.session.token, 'your_jwt_secret', (err, decoded) => {
      if (err) {  
        return res.redirect('/studentlogin');
      }   
      req.user = decoded;    
      next();            
    });
  } else {
    res.redirect('/studentlogin');
  }
}


app.post('/registration', async (req, res)=>{
  const { email, stuPassword } = req.body;

  // Check if userName already exists
  const userExists = await new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM studentinfo WHERE email = ?',
      [email],
      (err, result) => {
        if (err) reject(err);
        resolve(result.length > 0);
      }
    );
  });

  if (userExists) {
    res.send('Account already exists with this username. <a href="/studentlogin">Login</a>');
  } else {
    // Hash the password
    const hashedPassword = await bcrypt.hash(stuPassword, 10);

    // Store the user in the database
    db.query(   
      'INSERT INTO studentinfo (email, stuPassword) VALUES (?, ?)',
      [email, hashedPassword],
      (err) => {
        if (err) throw err;
        res.redirect('/studentlogin');  
      }
    );
  }
})



app.get('/studentlogin', (req, res)=>{
  res.render('studentlogin');

});


// app.get('/welcome',(req, res)=>{
//   res.render('welcome');
// })



app.post('/studentlogin', async (req, res)=>{
  const { email, stuPassword } = req.body;
  //added new
//console.log(email);
//console.log(stuPassword);
  // Check if userName exists
  const user = await new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM studentinfo WHERE email = ?',
      [email],
      (err, result) => {
        if (err) reject(err);
        resolve(result[0]);
      }
    );
  });

  // added new
  //console.log(user);



  if (!user) {
    res.send('Invalid username. <a href="/registration">Register</a>');
  } else {
    // Check password
    const passwordMatch = await bcrypt.compare(stuPassword, user.stuPassword);    

    if (passwordMatch) {
      // Create JWT token
      const token = jwt.sign({ userId: user.stuId, userName: user.email }, 'your_jwt_secret', {    
        expiresIn: '1h', // Set token expiration time
      });

      // Save token in session and cookie
      req.session.token = token;
      res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
      console.log(req.session.token);
      //my  
      req.session.mykey = user.stuId;   
      res.redirect('/');   
       
    } else {
      
      res.send('Incorrect password. <a href="/studentlogin">Login</a>');
    }
  }   
})

//new added 
app.get('/welcome', isAuthenticated, (req, res) => {  
   //console.log(req);    
   console.log(req.session.token);   
   res.send(`<h1>Welcome, ${req.user.userName}!</h1><a href="/logout">Logout</a>`);
});
   
app.get('/uploadVideoSection' , (req , res)=>{
  res.render('uploadVideoSection');  
})

app.post('/uploadVideoSection',(req, res)=>{
  // console.log(req.body);   
  //res.send("selected");  
  var courseSection=req.body.courseSection;   
 //console.log(courseSection);     
  var query='select * from course where courseSection=(?)'

  db.query(query, [courseSection] , (err, result)=>{
    if(err)
    {
      res.json({msg:"not available any course in this course section"});
    }  
    else{
      res.render('uploadVideoWithCourses',{coursesection:courseSection,courseitem:result});  
      //res.redirect('/uploadnoteswithcourses');
      //res.send("catched");
    }         
  })
})

app.post('/uploadVideoWithCourses', upload2.single('videoFile'), (req, res)=>{
  const classVideoName=req.body.videoName;      
  const videoPath='\\'+req.file.filename;
  const courseName=req.body.courseName;
  const coursesection=req.body.coursesection;

  //console.log(classVideoName);
  //console.log(videoPath);
  //console.log(courseName);
  //console.log(coursesection);
  var courseid; 


  const sql=`select courseId from course where courseSection=(?) and courseName=(?)`   
  db.query(sql, [coursesection, courseName], (err, result)=>{
  if(err){
      //console.log('in error part');
      console.error('courseId not available', err);
      res.status(500).json({message:'course id not available'});

        }
    else if(result.length===0)
    {  
      console.log('not found');console.log('not found');
    }
    else{            
      //console.log('in result part');  
      if (result.length > 0) {
          //console.log(result);
          //console.log(result[0]);
          //console.log(result[0].courseId);     
          // Assuming courseId is the column name in your database
          courseid = result[0].courseId;    
          //console.log(courseid);   
          let sql1=`insert into videoclasses(courseId, classVideoName, videoPath) value(?,?,?)`;
          db.query(sql1, [courseid, classVideoName ,videoPath], (err, result) => {   
            if (err) {  
                console.error('Error storing video in database:', err);
                res.status(500).json({ success: false, error: 'Failed to store video in database' });
            } else {
                res.json({ success: true, msg: `video ${req.file.originalname} uploaded successfully` });
            }
        });
        
      }

    }
  }) 
});


app.post('/latestNotice' , (req, res)=>{
  console.log("in abc");  
  console.log(req.body);
  var notice=req.body.latestNews;
  var noticeType='latestNews';    
  
  const sql ='insert into admissionnotice(notice , noticeType) value(? , ?)';
  db.query(sql,[notice, noticeType] , (err, result)=>
  {
    if(err)     
    {
      console.log("am in error");
      console.log('error', err);
      res.json({msg:"notice not uploaded."});
    }else
    {
      console.log('here');
      res.send('notice uploaded');   
    }
  })

})

app.post('/upcomingNotice' , (req, res)=>{
  console.log("in abc");  
  console.log(req.body);
  var notice=req.body.latestNews;
  var noticeType='upcomingNews';    
  
  const sql ='insert into admissionnotice(notice , noticeType) value(? , ?)';
  db.query(sql,[notice, noticeType] , (err, result)=>
  {
    if(err)     
    {
      console.log("am in error");
      console.log('error', err);
      res.json({msg:"notice not uploaded."});
    }else
    {
      console.log('here');
      res.send('notice uploaded.')   
    }
  })

})  


app.get('/admissionNotice', (req, res)=>{
  const sql='select notice from admissionnotice where noticeType=(?)';
  const sql1='select notice from admissionnotice where noticeType=(?)';
  noticetype='latestNews';
  noticetype1='upcomingNews';
  db.query(sql, [noticetype], (err, result1)=>{
    if(err){
      return console.error('latest notice not available',err);    
    }    
    db.query(sql1, [noticetype1], (err, result2)=>{
      if(err){          
       return  console.error('latest notice not available',err);
      }
      res.render('admissionNotice', {latest:result1, upcoming:result2});
    })

  })
  
})

app.get('/feestructure' , (req, res)=>{
  const fees='select * from course';
  db.query(fees,(err,result)=>{
    if(err)
    {
      console.error("course not available");
    }
    else{
      console.log(result);
      res.render('feestructure',{fees: result});

    }
  })
  
})

app.get('/studentFeedback' , (req, res)=>{
  
  res.render('studentFeedback');

})

app.post('/studenteedback', (req ,res)=>{ 
      
 // console.log(req.body);
  var stuname=req.body.name;
  var feedback=req.body.feedtext;
  const sql='insert into studentfeedback(feedback, stuName) value(?,?)';
  db.query(sql, [feedback, stuname],(err, result)=>{
    if(err){      
      console.error(err);
    }
    else{
      res.json({msg:'feedback uploaded'});  
    }
  })
})


app.get('/doubt' , (req, res)=>{
  res.render('doubtAsked');
} )

app.get('/parentZone', (req , res)=>{
  res.render('parentzone');
})

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('token');
  res.redirect('/');  
});   

app.get('/myProfile/:userid',isAuthenticated, (req, res)=>{
  //console.log("ok"); 
  //console.log(req.params.userid);
  let userid1=req.params.userid;
  let sql3=`select *from 
	(select course.courseId, course.courseName, course.courseTime , course.noteAvalaible, course.coursePrice, course.coordinator,course.videoClasses, course.topics, course.imagePath, course.courseSection, table2.stuId,table2.currentTime 
    from course    
    right join 
    (select * from enrolledcourses WHERE stuId=${userid1}) as table2 on course.courseId = table2.courseId) as table3 
    order by 
    currentTime 
    desc limit 1; `;
  db.query(sql3, (err, result)=>{
    if(err){
      console.error(err);
    }
    else{   
      //console.log(result); 
      //console.log(result.imagePath);  
      res.render('profilePage',{users: req.params.userid , recentCourse:result});  
    }
  })  
   
    
}) 

app.get('/MyAccount/:userid', (req, res)=>{
  //console.log("ok"); 
  console.log(req.params.userid);  
  res.render('MyAccount',{users: req.params.userid});   
})

app.get('/MyEnrollments/:userid' , (req, res)=>{
  //console.log("ok"); 
  //console.log(req.params.userid);  
  //res.render('myEnrollments.ejs',{users: req.params.userid});   

    //console.log("ok"); 
  //console.log(req.params.userid);
  let userid1=req.params.userid;
  let sql3=`select *from 
	(select course.courseId, course.courseName, course.courseTime , course.noteAvalaible, course.coursePrice, course.coordinator,course.videoClasses, course.topics, course.imagePath, course.courseSection, table2.stuId,table2.currentTime 
    from course    
    right join 
    (select * from enrolledcourses WHERE stuId=${userid1}) as table2 on course.courseId = table2.courseId) as table3 
    order by 
    currentTime; `;
  db.query(sql3, (err, result)=>{
    if(err){
      console.error(err);
    }
    else{          
      //console.log(result);   
      //console.log(result.imagePath);  
      res.render('myEnrollments.ejs',{users: req.params.userid , enrollCourse:result});  
    }
  })
})



app.get('/enrollCourse/:courseid' , isAuthenticated, (req, res)=>{
  console.log("ok"); 
  console.log(req.user.userId);
  console.log(req.params.courseid);   
  let userid=req.user.userId;   
  let courseid=parseInt(req.params.courseid);
                
  let sql=`insert into enrolledcourses(stuId, courseId,currentTime) value (${userid},${courseid},CURRENT_TIMESTAMP)`;       
  db.query(sql, (err , result)=>{
    if(err){      
      console.error(err);
    }
    else{
      console.log("insert successfully");
      res.redirect(`/myProfile/${userid}`);     
    }
  })      
})   

app.get('/onlineClass/:courseid', isAuthenticated,(req, res)=>{
  let sql4=`select * from videoclasses where courseId=${req.params.courseid}`;
  db.query(sql4,(err, result)=>{   
    if(err){
        console.error(err);       
    }       
    else{   
      let sql5=`select courseName , courseTime from course where courseId=${req.params.courseid}`;
      db.query(sql5, (err1 , result1)=>{   
        if(err1){
          console.error(err1);
        }
        else{
          let sql6 = `SELECT noteId, noteName FROM notes where courseId=${req.params.courseid}`;
          db.query(sql6, (err, result5)=>{
            if(err){
              console.error(err);
            }
            else{
              console.log(result5);
              res.render('onlineClass', {videos: result , users: req.user.userId , i:0 , coursename:result1 , note: result5});

            }
          
          });   
             
        }
      })   
      //console.log(req.params);
      //console.log(req.params.courseid);
      //console.log(result);  
       
    }
  })    
}) 



// Route to download an individual PDF
app.get('/download/:noteid', (req, res) => {
  let noteId = req.params.noteid;
  //added new     
  //console.log('pdfId: %d', pdfId);

  let sql = 'SELECT noteName, notePdf FROM notes WHERE noteId = ?';

  db.query(sql, [noteId], (err, result) => {
      if (err) {
          console.error('MySQL query error:', err);
          res.status(500).json({ message: 'Error fetching PDF from the database.' });
      } else if (result.length === 0) {
          res.status(404).json({ message: 'PDF not found.' });
      } else {
          let pdfName = result[0].noteName;
          let pdfData = result[0].notePdf;
          
          res.attachment(pdfName);
          res.send(pdfData);
      }
  });    
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});




