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
app.use(express.static('blogs'));
app.use(fileUpload());


const port = 4000;


app.get('/', (req, res) => {
    res.send("hello from db it's working working")
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  const ordersCollection = client.db(process.env.DB_NAME).collection("orders");
  const productsCollection = client.db(process.env.DB_NAME).collection("products");
  const blogsCollection = client.db(process.env.DB_NAME).collection("blogs");
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

  // product related actions //

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

app.get('/getProductById/:id', (req,res) => {
    const id = req.params.id;
    //console.log(id);
    productsCollection.find({ id })
    .toArray((err,documents) => {
        res.send(documents[0])
    })
})

app.post('/getCartProducts', (req,res) => {
        const keys = req.body;

        console.log(keys)

        productsCollection.find( {id: {$in: keys }})
        .toArray((err,documents) => {
            if(documents.length > 0){
                console.log(documents)
                res.send(documents)
            }
        })
      

        console.log(keys);
})

app.patch('/updateProduct/:id', (req,res) => {
    const _id = req.params.id;
    const file = req.files.image;
    const id = req.body.id;
    const title = req.body.title;
    const category = req.body.category;
    const description = req.body.description;
    const weight = req.body.weight;
    const productType = req.body.productType
    const regularPrice = req.body.regularPrice;
    const salePrice = req.body.salePrice;

    console.log({
        _id, id, file ,title, category, description, weight, productType, regularPrice, salePrice
    })

    const filePath = `${__dirname}/products/${file.name}`;

    file.mv(filePath, err => {
        if(err){
            console.log(err)
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

        productsCollection.updateOne({_id: ObjectId(_id)},{
            $set: {id, title, category, description, weight, productType, regularPrice, salePrice, image}
        })
        .then( result => {
            fs.remove(filePath, error => {
                if(error){
                    console.log(error);
                    res.status(500).send({ msg: 'file failed to upload'})
                }
                res.send(result.modifiedCount > 0);
            })
        })
        
    })
})

app.delete('/deleteProduct/:id', (req,res) => {
    const id = req.params.id;

    productsCollection.deleteOne({ _id: ObjectId(id)})
    .then( result => {
        res.send(result.deletedCount > 0)
    })
})

  
// Blog related actions //


app.post('/addBlog',(req,res) => {

    const file = req.files.file;
    const title = req.body.title;
    const location = req.body.location;
    const description = req.body.description;
    const publish = req.body.publish;

    

    const filePath = `${__dirname}/blogs/${file.name}`;

    file.mv(filePath, err => {
        if(err){
            console.log(err)
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

        console.log({ title, file, location, description, publish, image })

        blogsCollection.insertOne({ title, location, description, image, publish})
        .then( result => {
            fs.remove(filePath, error => {
                if(error){
                    console.log(error);
                    res.status(500).send({ msg: 'file failed to upload'})
                }
                res.send(result.insertedCount > 0);
            })
        } )


       // return res.send({ name: file.name , path:`/${file.name}`})
    })

})

app.get('/getBlogs',(req, res) => {
    blogsCollection.find({})
    .toArray( (err, documents) => {
        res.send(documents)
    })
})

app.patch('/updateBlogPublishStatus/:id',(req,res) => {
    const id = req.params.id;
    const publish = req.body;

    blogsCollection.updateOne({ _id: ObjectId(id)},{
        $set: {publish}
    })
    .then(result => {
        res.send( result.modifiedCount > 0);
    })

})

app.patch('/updateBlog/:id', (req, res) => {
    const id = req.params.id;
    const file = req.files.file;
    const title = req.body.title;
    const location = req.body.location;
    const description = req.body.description;

    const filePath = `${__dirname}/blogs/${file.name}`;

    if(file){

        file.mv(filePath, err => {
            if(err){
                console.log(err)
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
            
    
           
    
            console.log({ title, location, description,  image })
    
            blogsCollection.updateOne({_id: ObjectId(id)},{
                $set: { title, location, description, image}
            }).then( result => {
                fs.remove(filePath, error => {
                    if(error){
                        console.log(error);
                        res.status(500).send({ msg: 'file failed to upload'})
                    }
                    res.send(result.modifiedCount > 0);
                })
            })
    
        })
        
    }
    else{
        blogsCollection.updateOne({ _id: ObjectId(id)},{
            $set: { title, location, description }
        })
        .then( result => {
            res.send(result.matchedCount > 0 )
        })
    }
   

    console.log({id, file, title, location, description})

})



  console.log('Database Connected Successfully');
 
});

app.listen(process.env.PORT || port);
