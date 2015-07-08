## Queue Commander

AMQP for dummies

```
npm install queue-commander
```

## Usage

```
var QueueCommander = require('queue-commander');
var qc = new QueueCommander();
```

1. declare queue

```
qc.registerQueue('fruits', {durable: false}); // configure queue here
```

2. declare channel(s)

```
var apple = qc.channel({name: 'apple', input: 'fruits'}); // RPC
var orange = qc.channel({name: 'orange', input: 'fruits', output: 'results'}); // remote job
```

3. on server

```
apple.onServer(function(args, done) {
    done(null, 'yummy ' + args.name);
});
```

4. on client: remote call

```
// register call
var sendToAppleQueue = apple.onClient();
// make a call
sendToAppleQueue({name: 'golden apple'}).then(function(response) {
    console.log(response); // yummy golden apple
});
```

5. on client: remote job
```
// register job
var sendToOrangeQueue = orange.onClient(function(err, res, next){
    console.log(res); // yummy sweet orange
    next();
});
// post a job
sendToOrangeQueue({name: 'sweet orange'}); // note that callback will not be called
```
