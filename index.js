const  express = require('express') 
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express()

app.use(express.json()) ; 
app.use(cors()); 



const SECRET = 'jaishreeram' 


const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  appointmentRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentRequest'
  }]
});


const appointmentRequestSchema = new mongoose.Schema({
  userEmail : String ,
  doctorName: String,
  time: String,
  date: String,
  price : Number ,
  status: {
      type: Boolean,
      default: false,
  }
});






const adminSchema = mongoose.Schema({
    username : String , 
    email : String ,
    password : String ,
    
})

const applydoctorSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  phoneNumber: Number,
  address: String,
  website: String,
  email: String,
  specialization: String,
  experience: Number,
  fees: Number,
  timingfrom: String,
  timingto: String,
  password: String,
  appointmentRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppointmentRequest'
  }]
});




const User = mongoose.model('User' , userSchema) ;
const Admin = mongoose.model('Admin' , adminSchema) ;
const Applydoctor = mongoose.model('Applydoctor' , applydoctorSchema)
const AppointmentRequest = mongoose.model('AppointmentRequest', appointmentRequestSchema);

mongoose.connect('mongodb+srv://harsh:Geetasingh%40098@cluster0.wifoeru.mongodb.net/?retryWrites=true&w=majority', { dbName: "myhealth" });

const authenticateJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET, (err, user) => {
        if (err) {
          return res.sendStatus(403);
        }
        req.user = user;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };



  app.get('/' , (req,res) => {
    res.json("hello")
  })

  app.post('/admin/signup', async(req, res) => {
    const { username, password , email } = req.body;
    const admin = await Admin.findOne(email)
      if (admin) {
        res.status(403).json({ message: 'Admin already exists' });
      } else {
        const obj = { username: username, password: password  , email : email};
        const newAdmin = new Admin(obj);
        newAdmin.save();
        const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Admin created successfully', token });
      }
  
    
  });
  

  
  app.post('/admin/login', async (req, res) => {
    const { email , password } = req.body;
    const user = await Admin.findOne({ email});
    console.log(user)
    if (user && user.password == password) {
      const token = jwt.sign({ email, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token ,  email : user.email });
    } else {
      res.status(403).json({ message: 'Invalid username or password'  });
    }
  });

  app.post('/users/signup', async (req, res) => {
    const { username, password  , email} = req.body;
    const user = await User.findOne({ email });
    if (user) {
      res.status(403).json({ message: 'User already exists' });
    } else {
      const newUser = new User({ username, password ,email});
      await newUser.save();
      const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'User created successfully', token  , email });
    }
  });
  
  app.post('/users/login', async (req, res) => {
    const { email , password } = req.body;
    const user = await User.findOne({ email});
    console.log(user)
    if (user && user.password == password) {
      const token = jwt.sign({ email, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token ,  email : user.email });
    } else {
      res.status(403).json({ message: 'Invalid username or password'  });
    }
  });
  
 
  app.post('/users/applydoctor', async (req,res)  => {
        
    const {firstName , lastName , phoneNumber , address  , website , email , specialization , experience , fees , timingfrom , timingto , password} = req.body ; 
    const admin = await Admin.findOne({email}) ; 
    if(admin) {
          res.json({message : 'doctor already exist with this email'})
    } else {
      const newUser =  new Applydoctor({firstName , lastName , phoneNumber , address  , website , email , specialization , experience , fees , timingfrom , timingto , password}) 
      await newUser.save() ;
      const newAdmin = new Admin({email , password}) 
      await newAdmin.save()
      res.status(200).json({message : "you will be informed through mail if you will be eligible"})
    }

  } ) 

  app.get('/doctors' , async (req,res) => {
    const data = await Applydoctor.find() ;
    if(data){
      res.status(200).json({doctors : data})
    }else{
      res.json({message  : "failed to fetch data from db"})
    }
  })









  app.post('/appointment/request', async (req, res) => {
    const { userEmail, doctorId, doctorName, time, date , price} = req.body;

    try {
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const appointmentRequest = new AppointmentRequest({
            userEmail ,
            doctorName,
            time,
            date,
            price ,
            status: false
        });
        const savedAppointmentRequest = await appointmentRequest.save();

        user.appointmentRequests.push(savedAppointmentRequest._id);
        await user.save();

        const doctor = await Applydoctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        doctor.appointmentRequests.push(savedAppointmentRequest._id);
        await doctor.save();

        return res.status(200).json({ message: 'Appointment request saved successfully' });
    } catch (error) {
        console.error('Error saving appointment request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});





app.post('/user/appointments', async (req, res) => {
  const { userEmail } = req.body;

  try {
      const user = await User.findOne({ email: userEmail }).populate('appointmentRequests');
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(user.appointmentRequests);
  } catch (error) {
      console.error('Error fetching appointments:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/doctor/appointments', async (req, res) => {
  const { userEmail } = req.body;

  try {
      const doctor = await Applydoctor.findOne({ email: userEmail }).populate({
          path: 'appointmentRequests',
          match: { status: false } 
      });

      if (!doctor) {
          return res.status(404).json({ error: 'Doctor not found' });
      }

      return res.status(200).json(doctor.appointmentRequests);
  } catch (error) {
      console.error('Error fetching appointments:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.post('/doctor/approvedappointments', async (req, res) => {
  const { userEmail } = req.body;

  try {
      const doctor = await Applydoctor.findOne({ email: userEmail }).populate({
          path: 'appointmentRequests',
          match: { status: true } 
      });

      if (!doctor) {
          return res.status(404).json({ error: 'Doctor not found' });
      }

      return res.status(200).json(doctor.appointmentRequests);
  } catch (error) {
      console.error('Error fetching approved appointments:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
});




  app.get('/appointments/', async (req, res) => {
    const userEmail = req.body

    try {
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ appointmentRequests: user.appointmentRequests });
    } catch (error) {
        console.error('Error fetching appointment requests:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
  }); 

  app.put('/doctor/appointment/approve', async (req, res) => {
    const { email, appointmentId } = req.body; 
    
    try {
        const doctor = await Applydoctor.findOne({ email });
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const appointmentRequest = await AppointmentRequest.findById(appointmentId);
        if (!appointmentRequest) {
            return res.status(404).json({ error: 'Appointment request not found' });
        }

       
        appointmentRequest.status = true;
        await appointmentRequest.save();

        if (!doctor.appointmentRequests.includes(appointmentRequest._id)) {
            doctor.appointmentRequests.push(appointmentRequest._id);
            await doctor.save();
        }

        return res.status(200).json({ message: 'Appointment status updated successfully' });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

  
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });




  

 






  