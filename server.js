import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import { GridFSBucket } from "mongodb";
import flash from 'connect-flash';
import multer from "multer";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Import models
import Enroll from "./models/enroll.model.js";
import User from "./models/user.model.js";
import Event from "./models/event.model.js";

dotenv.config();

// Initialize Express app
const app = express();

// Configure view engine and views directory
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
  secret: 'jarvis',
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messaging middleware
app.use(flash());

// Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'assets', 'images')), express.static('images'));

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connection to Database Successful");
  })
  .catch((e) => {
    console.error("An error occurred --->", e);
  });

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'), {
    headers: {
      'Content-Type': 'text/css'
    }
  });
});

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  console.log(date.toLocaleDateString('en-US', options))
  return date.toLocaleDateString('en-US', options);
}

function getShortDate(dateFromMongoDB) {
  // Convert MongoDB date string to JavaScript Date object
  const date = new Date(dateFromMongoDB);

  // Array of month names
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Get month, date, and year separately
  const monthIndex = date.getMonth();
  const monthName = monthNames[monthIndex];
  const day = date.getDate();
  const year = date.getFullYear();

  // Return formatted date components
  return { month: monthName, day, year };
}

// Initialize GridFS
const conn = mongoose.connection;
let gfs;
const bucket = new GridFSBucket(conn);

conn.once('open', () => {
  // Initialize GridFS stream
  gfs = new GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
});

// Passport configuration
passport.use(new LocalStrategy(async (username, password, done) => {
  console.log(username, password)
    try {
        const user = await User.findOne({ username });

        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }

        const passwordMatch = password === user.password

        if (!passwordMatch) {
            return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Routes
app.post('/login', passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get("/login", (req, res)=>{
  const loginPath = path.join(__dirname+ "/pages/AdminLogin.html") 
  res.sendFile(loginPath)
})

app.get("/admin", isAuthenticated, (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/AdminDashboard.html") 
  res.sendFile(loginPath)
})

app.get("/home", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/index.html") 
  console.log(loginPath)
  res.sendFile(loginPath)
})
app.get("/about", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/AboutUs.html") 
  res.sendFile(loginPath)
})
app.get("/kayoleBranch", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/KayoleBranch.html") 
  res.sendFile(loginPath)
})
app.get("/mainBranch", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/MainBranch.html") 
  res.sendFile(loginPath)
})
app.get("/history", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/OurHistory.html") 
  res.sendFile(loginPath)
})
app.get("/ourTeam", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/OurTeam.html") 
  res.sendFile(loginPath)
})
app.get("/tour", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/Tour.html") 
  res.sendFile(loginPath)
})
app.get("/townBranch", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/TownBranch.html") 
  res.sendFile(loginPath)
})
app.get("/enrollment", (req, res)=> {
  const loginPath = path.join(__dirname+ "/pages/Enrollment.html") 
  res.sendFile(loginPath)
})

app.get("/app")



app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

app.get("/create-event", (req, res)=> {
  const loginPath = path.join(__dirname+"/pages/Create-event.html");
  res.sendFile(loginPath)
})

// Middleware for protecting routes
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.post("/data", async (req, res, next) => {
  const { fullName, parentEmail, gender, age, grade, branch } = req.body;
  const newEnrollment = new Enroll({ fullName, parentEmail, gender, age, grade, branch });
  try {
    await newEnrollment.save();
    console.log(newEnrollment);
    res.json("Enrollment Saved Successfully");
  } catch (error) {
    console.log(error);
  }
});

app.post('/create-event',isAuthenticated, upload.single('pic'), async (req, res) => {
  try {
    // Save the image file to GridFS
    const fileId = new mongoose.Types.ObjectId();
    const filename = req.file.originalname;
    const fileData = req.file.buffer;
    const imageUploadStream = gfs.openUploadStreamWithId(fileId, filename);
    imageUploadStream.write(fileData);
    imageUploadStream.end();

    const { name, startDate, endDate, venue, description } = req.body;
    
    // Format the startDate and endDate fields
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Create a new event with the form data and the GridFS file reference
    const newEvent = new Event({
      name, 
      startDate: formattedStartDate, 
      endDate: formattedEndDate, 
      venue,
      description,
      pic: {
        fileId: fileId,
        filename: filename
      }
    });
    await newEvent.save();
    res.status(200).json("Event created Successfully")
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/files/:filename', async (req, res) => {
  try {
    // Retrieve the fileId from the request parameters
    const fileName = req.params.filename;
    // Retrieve the file data from GridFS based on the fileId
    const downloadStream = await gfs.openDownloadStreamByName(fileName);

    // Set the appropriate content type based on the file type
    res.set('Content-Type', 'image/jpeg'); // Set the content type based on the file type (e.g., image/jpeg, application/pdf, etc.)
    
    // Error handler for file not found
    downloadStream.on('error', (error) => {
      console.error('File not found:', error);
      res.status(404).send('File not found');
    });

    // Pipe the file stream to the response
    await downloadStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).limit(5);
      events.forEach(event => {
        event.smallDate = getShortDate(event.startDate)
        event.formattedStartDate = formatDate(event.startDate);
        event.formattedEndDate = formatDate(event.endDate);
      });

      res.render('events', { events }); // Render the 'events' template with the fetched events
  } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/enrolls', isAuthenticated, async (req, res) => {
  try {
      const students = await Enroll.find();
      res.render('enrolls', { students })
  } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
