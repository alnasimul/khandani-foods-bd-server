const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fpbtl.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('products'));
app.use(fileUpload());


const port = 4000;


app.get('/', (req, res) => {
    res.send("hello from db it's working working")
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  const ordersCollection = client.db(process.env.DB_NAME).collection("orders");
  const productsCollection = client.db(process.env.DB_NAME).collection("products");
  // perform actions on the collection object

  app.post('/addOrder',(req,res) => {
      const singleOrder = req.body;
   //   console.log(singleOrder);
      ordersCollection.insertOne(singleOrder)
      .then(result => {
          res.send( result.insertedCount> 0)
      })

  })
  
  app.post('/trackOrder',(req,res) => {
      const data = req.body;
   //  console.log(data);
      ordersCollection.find(data)
      .toArray((err,documents) => {
          res.send(documents);
          console.log(documents);
      })
  })

  app.post('/ordersByDate',(req,res) => {
      const date = req.body;
     // console.log(date)
      ordersCollection.find({created: date.date})
      .toArray((err,documents) => {
          res.send(documents)
      })
  })

  app.get('/getOrders',(req,res) => {
      ordersCollection.find({orderStatus: 'open'})
      .toArray((err,documents) => {
          res.send(documents);
      })
  })

  app.patch('/updateStatus/:id', (req,res) => {
      const id = req.params.id;
      
      const status = req.body;
     // console.log(id,status);

      //updating payment status

      if(status.paymentStatus){
        ordersCollection.updateOne({_id: ObjectId(id)},{
            $set: {paymentStatus: status.paymentStatus}
        })
        .then(result => {
            res.send( result.modifiedCount > 0)
        })
      }
      //updating delivery status

      else if(status.deliveryStatus){
        ordersCollection.updateOne({_id: ObjectId(id)},{
            $set: {deliveryStatus: status.deliveryStatus}
        })
        .then(result => {
            res.send( result.modifiedCount > 0)
        })
      }
      else {
        ordersCollection.updateOne({_id: ObjectId(id)},{
            $set: {orderStatus: status.orderStatus}
        })
        .then(result => {
            res.send( result.modifiedCount > 0)
        })
      }
     
  })

  app.patch('/updateClientInfo/:id',(req,res) => {
      const id = req.params.id;
      const clientInfo = req.body;

      //console.log(id, clientInfo);
      
      ordersCollection.updateOne({_id: ObjectId(id)},{
          $set: {name: clientInfo.name , phone: clientInfo.phone, email: clientInfo.email, city: clientInfo.city, address: clientInfo.address  }
      })
      .then( result => {
          res.send( result.modifiedCount > 0)
      })

      
  })
  app.post('/addProduct',(req,res) => {
    const file = req.files.image;
    const id = req.body.id;
    const title = req.body.title;
    const category = req.body.category;
    const description = req.body.description;
    const weight = req.body.weight;
    const productType = req.body.productType
    const regularPrice = req.body.regularPrice;
    const salePrice = req.body.salePrice;

    console.log({file,id,title,category,description,weight,productType,regularPrice,salePrice});

    const filePath = `${__dirname}/products/${file.name}`;

    file.mv(filePath, err => {
        if(err){
            console.log(err);

            res.status(500).send({ msg: 'file failed to upload'})
        }

        const newImg = fs.readFileSync(filePath);

        const encImg = newImg.toString('base64');

        var image = {
            name: file.name,
            contentType: file.mimetype,
            size: file.size,
            img: Buffer.from(encImg, 'base64')
        };

        productsCollection.insertOne({id, title, category, description, weight, productType, regularPrice, salePrice, image})
        .then( result => {
            fs.remove(filePath, error => {
                if(error){
                    console.log(error);
                    res.status(500).send({ msg: 'file failed to upload'})
                }
                res.send(result.insertedCount > 0);
            })
        })
  

       // return res.send({ name: file.name , path:`/${file.name}`});
    })
})

app.get('/getProducts', (req,res) => {
    productsCollection.find({})
    .toArray((err,documents) => {
        res.send(documents);
    })
})

  console.log('Database Connected Successfully');
 
});

app.listen(process.env.PORT || port);
