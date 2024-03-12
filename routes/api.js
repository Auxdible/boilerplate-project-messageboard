'use strict';

const bcrypt = require('bcrypt');
const mongoClient = require("../util/mongoClient");
const { ObjectId } = require('mongodb/lib/bson');

const PASSWORD_SALT_ROUNDS = 12;

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get(
      async (req, res) => {
          let threads = mongoClient.collection('threads').find({
              board: req.params['board'],
          },
          {
            projection: { delete_password: 0, reported: 0 }
          }).sort({ bumped_on: -1 }).limit(10);
          let result = []
          while (await threads.hasNext()) {
            let thread = await threads.next();
            if (!thread) continue;
            let replies = [];
            let repliesFind = mongoClient.collection('replies').find({ 
              _id: { 
                $in: thread['replies']
              }
            }, {
              projection: { delete_password: 0, reported: 0 }
            }).sort({ created_on: -1 }).limit(3);
            while (await repliesFind.hasNext()) {
                const reply = await repliesFind.next();
                replies.push(reply);
            }
            result.push({  
              ...thread, 
              replies: replies.map((i) => ({
                ...i,
                created_on: new Date(i.created_on),
              }))
            })
          }
          return res.json(result.map((i) => {
            return {
              ...i,
              created_on: new Date(i.created_on),
              bumped_on: new Date(i.bumped_on),
            }
          }));
      
    })
    .post(
      async(req, res) => {
        const board = req.params['board'],
              text = req.body['text'],
              delete_password = await bcrypt.hash(req.body['delete_password'], PASSWORD_SALT_ROUNDS);
        mongoClient.collection('threads').insertOne({
            board,
            text,
            delete_password,
            created_on: Date.now(),
            bumped_on: Date.now(),
            reported: false,
            replies: []
        }, {
          projection: { delete_password: 0 }
        }).then(() => {
          res.redirect(`/b/${board}/`);
      }).catch(() => res.send('failure'))
    })
    .delete(
      (req, res) => {
        mongoClient.collection('threads').findOne({
          _id: ObjectId.createFromHexString(req.body['thread_id']),
          board: req.params['board'],
          
        }, {
          projection: {
            delete_password: 1
          }
        }).then((data) => {
          if (!data) return res.status(404).send("Couldn't find that thread.");
          bcrypt.compare(req.body['delete_password'], data['delete_password'])
          .then((data) => {
            if (!data) return res.send("incorrect password");
            mongoClient.collection('threads').deleteOne({
              _id: ObjectId.createFromHexString(req.body['thread_id']),
            }).then((data) => {
              if (data.deletedCount <= 0) return res.send("failed");
              return res.send("success");
            })
          })
        })
      }
    )
    .put(
      (req, res) => {
        mongoClient.collection('threads').findOneAndUpdate({
          _id: ObjectId.createFromHexString(req.body['report_id'] ?? req.body['thread_id']),
          board: req.params['board'],
          
        },
        {
          $set: { reported: true }
        })
        .then(() => {
          return res.send('reported');
        }).catch((x) => {
          console.log(x);
          return res.send('failed');
        })
      }
    );
    
  app.route('/api/replies/:board')
    .get(
      async (req, res) => {
      if (!req.query['thread_id']) return res.status(400).send("id not specified");
      mongoClient.collection('threads').findOne({
        board: req.params['board'],
        _id: ObjectId.createFromHexString(req.query['thread_id'])
      },
    {
      projection: { delete_password: 0, reported: 0 }
    }).then(async (thread) => {
      if (!thread) return res.status(404).send('no thread found');
      let repliesFind = mongoClient.collection('replies').find({ 
        _id: { 
          $in: thread['replies']
        }
      }, {
        projection: { delete_password: 0, reported: 0 }
      }).sort({ created_on: -1 }).limit(3);
      let replies = [];
      while (await repliesFind.hasNext()) {
          const reply = await repliesFind.next();
          if (!reply) continue;
          replies.push(reply);
      }
      
      return res.json({  
        ...thread, 
        created_on: new Date(thread.created_on),
        bumped_on: new Date(thread.bumped_on),
        replies: replies.map((i) => ({
            ...i,
            created_on: new Date(i.created_on),
          }))
        });
    }).catch((x) => {
      console.log(x)
      return res.send('failure');
    });
  })
    .post(
      async (req, res) => {
        const board = req.params['board'],
        thread_id = req.body['thread_id'],
        text = req.body['text'],
        delete_password = await bcrypt.hash(req.body['delete_password'], PASSWORD_SALT_ROUNDS),
        created_on = Date.now();
        mongoClient.collection('replies').insertOne({
            text,
            delete_password,
            created_on,
            reported: false,
        }).then((data) => {
          mongoClient.collection('threads').findOneAndUpdate({
            _id: ObjectId.createFromHexString(thread_id),
          }, {
            $set: { bumped_on: created_on },
            $push: {
              replies: data.insertedId
            }
          }).then(() => {
            return res.redirect(`/b/${board}/${thread_id}`)
          })
        }).catch(() => {
          return res.status(500).send("failrue");
        })
      }
    )
    .delete(
      (req, res) => {
        mongoClient.collection('threads').findOne({
          _id: ObjectId.createFromHexString(req.body['thread_id']),
          board: req.params['board'],
          
        }, {
          projection: {
            delete_password: 0
          }
        }).then((data) => {
          if (!data) return res.status(404).send("thread not found");

          if (!data['replies']?.map((i) => i.toString()).includes(req.body['reply_id'])) return res.status(404).send('reply not found');
          mongoClient.collection('replies').findOne({
            _id: ObjectId.createFromHexString(req.body['reply_id']),
          }, {
            projection: {
              delete_password: 1
            }
          })
          .then((data) => {
            if (!data) return res.status(404).send("no reply found");
            bcrypt.compare(req.body['delete_password'], data['delete_password'])
            .then((data) => {
              if (!data) return res.send("incorrect password");
              mongoClient.collection('replies').findOneAndUpdate({
                _id: ObjectId.createFromHexString(req.body['reply_id']),
              }, {
                $set: { text: '[deleted]' }
              }).then((data) => {
                if (data.deletedCount <= 0) return res.send("failed");
                return res.send("success");
              })
            })
          })
          
        })
      }
    )
    .put(
      (req, res) => {
        mongoClient.collection('threads').findOne({
          _id: ObjectId.createFromHexString(req.body['thread_id']),
          board: req.params['board'],
          
        }).then((data) => {
          if (!data) return res.status(404).send("thread not found");

          if (!data['replies']?.map((i) => i.toString()).includes(req.body['reply_id'])) return res.status(404).send('reply not found');
          mongoClient.collection('replies').findOne({
            _id: ObjectId.createFromHexString(req.body['reply_id']),
          })
          .then((data) => {
            if (!data) return res.status(404).send("no reply found");
            mongoClient.collection('replies').findOneAndUpdate({
              _id: ObjectId.createFromHexString(req.body['report_id'] ?? req.body['reply_id']),
              board: req.params['board'],
              
            },
            {
              $set: { reported: true }
            })
            .then(() => {
              return res.send('reported');
            }).catch((x) => {
              console.log(x);
              return res.send('failed');
            })
          })
          
        })
        
      }
    );

};
