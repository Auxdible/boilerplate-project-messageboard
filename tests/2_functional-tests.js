const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);
const host = "https://3000-freecodecam-boilerplate-e6oyvvg6vd4.ws-us108.gitpod.io";

suite('Functional Tests', function() {
    let board = Math.round(Math.random() * 10000)
    let reply_thread_id = ""
    describe("Thread Requests", () => {
        let thread_id = ""
        test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
            chai
            .request(host)
            .post('/api/threads/test_board_'+board)
            .send({ text: "Text_Test", delete_password: "deleteme20" })
            .end(function (err, res) {
                assert.notExists(err, "No error has occurred");
                assert.exists(res, "Response was returned");
                assert.include(res['redirects'], host+`/b/test_board_${board}/`, "User was redirected to board that thread was sent in")
                done();
            })
        })
        chai
            .request(host)
            .post('/api/threads/test_board_'+board)
            .send({ text: "Reply_Test", delete_password: "deleteme20" })
            .end()    
        test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
            chai
            .request(host)
            .get('/api/threads/test_board_'+board)
            .send()
            .end(function (err, res) {
                const data = res.body;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.isArray(data, "Response is an array");
                assert.isAbove(data.length, 0, "Array contains an element");
                let item = data[0];
                assert.hasAllKeys(item, ['text', '_id', 'bumped_on', 'created_on', 'board', 'replies'], "Threads return completely");
                assert.doesNotHaveAnyKeys(item, ['reported', 'delete_password'], "Threads do not contain sensitive information");
                assert.isString(item['text'], "text is a string");
                assert.isString(item['_id'], "_id is a string");
                assert.isString(item['bumped_on'], "bumped_on is a string");
                assert.isString(item['created_on'], "created_on is a string");
                assert.isString(item['board'], "board is a string");
                assert.isArray(item['replies'], "replies is an array");
                thread_id = item._id;
                reply_thread_id = data[1]._id;
                done();
            })
        })
        test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
            chai
            .request(host)
            .delete('/api/threads/test_board_'+board)
            .send({ delete_password: "suchafakepass", thread_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred.");
                assert.exists(data, "Response was returned.");
                assert.equal(data, "incorrect password", "Password is incorrect");

                done();
            })
        })
        test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
            chai
            .request(host)
            .delete('/api/threads/test_board_'+board)
            .send({ delete_password: "deleteme20", thread_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.equal(data, "success", "Thread is deleted");

                done();
            })
        })
        test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
            chai
            .request(host)
            .put('/api/threads/test_board_'+board)
            .send({ thread_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.equal(data, "reported", "Thread was reported");

                done();
            })
        })
    })
    describe("Reply Requests", () => {
        let reply_id = "";
        test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
            chai
            .request(host)
            .post('/api/replies/test_board_'+board)
            .send({ text: "Text_Test", delete_password: "deleteme40", thread_id: reply_thread_id })
            .end(function (err, res) {
                assert.notExists(err, "No error has occurred");
                assert.exists(res, "Response was returned");
                assert.include(res['redirects'], host+`/b/test_board_${board}/${reply_thread_id}`, "User was redirected to the thread that reply was sent in")
                done();
            })
        })
            
        test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
            chai
            .request(host)
            .get(`/api/replies/test_board_${board}?thread_id=${reply_thread_id}`)
            .send()
            .end(function (err, res) {
                const data = res.body;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.hasAllKeys(data, ['text', 'board', '_id', 'bumped_on', 'created_on', 'replies'], "Threads return completely");
                assert.doesNotHaveAnyKeys(data, ['reported', 'delete_password'], "Threads do not contain sensitive information");
                assert.isString(data['text'], "text is a string");
                assert.isString(data['_id'], "_id is a string");
                assert.isString(data['bumped_on'], "bumped_on is a string");
                assert.isString(data['created_on'], "created_on is a string");
                assert.isString(data['board'], "board is a string");
                assert.isArray(data['replies'], "replies is an array");
                assert.isAbove(data['replies'].length, 0, "replies contains atleast one element");
                const item = data['replies'][0];
                assert.hasAllKeys(item, ['text', '_id', 'created_on'], "Replies return completely")
                reply_id = item['_id'];

                assert.doesNotHaveAnyKeys(item, ['reported', 'delete_password'], "Replies do not contain sensitive information");
                done();
            })
        })
        test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
            chai
            .request(host)
            .delete('/api/replies/test_board_'+board)
            .send({ delete_password: "suchafakepass", thread_id: reply_thread_id, reply_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred.");
                assert.exists(data, "Response was returned.");
                assert.equal(data, "incorrect password", "Password is incorrect");

                done();
            })
        })
        test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
            chai
            .request(host)
            .delete('/api/replies/test_board_'+board)
            .send({ delete_password: "deleteme40", thread_id: reply_thread_id, reply_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.equal(data, "success", "Reply is deleted");

                done();
            })
        })
        test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
            chai
            .request(host)
            .put('/api/replies/test_board_'+board)
            .send({ thread_id: reply_thread_id, reply_id })
            .end(function (err, res) {
                const data = res.text;
                assert.notExists(err, "No error has occurred");
                assert.exists(data, "Response was returned");
                assert.equal(data, "reported", "Reply was reported");

                done();
            })
        })
    })
});
