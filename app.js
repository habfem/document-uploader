const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage').GridFsStorage;
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//MONGO URI
const mongoURI = 'mongodb+srv://habfem:habfem96@mongouploads.rufvu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

//Init gfs

let gfs, gridfsBucket;
  conn.once('open', () => {
   gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
   bucketName: 'uploads'
 });

   gfs = Grid(conn.db, mongoose.mongo);
   gfs.collection('uploads');
});

// Create storage engine
 const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// @rooute GET /
// @desc Loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) =>  {
    //check if files exists
    if(!files || files.length === 0 ) {
     res.render('index', {files: false});
    } else {
      files.map(file => {
        if(file.contentType === 'application/pdf' || file.contentType ==='image/png' || file.contentType ==='image/jpeg' || file.contentType ==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
          file.isDoc = true;
        } else {
          file.isDoc = false;
        }
      });
      res.render('index', { files: files });
    }
  });
});

// @route POST /upload
// @desc uploads file to DB
app.post('/upload', upload.array('file'), (req, res) => {
  //res.json({ file: req.file });
  res.redirect('/');
});

// @rout GET /files
//@desc Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) =>  {
    //check if files exists
    if(!files || files.length === 0 ) {
      return res.status(404).json({
        err: 'No files exists'
      });
    }
    // Files exist
    return res.json(files)
  });
});

// @route GET /files/:filename
//@desc Display single file object in JSON
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
//@desc Display doc
app.get('/doc/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if document
    if(file.contentType === 'application/pdf' || file.contentType ==='image/png' || file.contentType ==='image/jpeg' || file.contentType ==='application/vnd.openxmlformats-officedocument.wordprocessingml.document') 
      {
    const readStream = gridfsBucket.openDownloadStream(file._id);
    readStream.pipe(res);
 }else {
      res.status(404).json({
        err: 'Not a document'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc Delete file
 app.delete('/files/:id', (req, res) => {
   gfs.remove({ _id: req.params.id, root: 'uploads' }, (err) => {
    if (err) {
      //return res.status(404).json({ err: err });
      return handleError(err);
    }
    res.redirect('/'); 
  }); 
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))