## Queue Commander

AMQP for dummies

```shell
npm install queue-commander
```

## Usage


```javascript
var QueueCommander = require('queue-commander');
var qc = new QueueCommander(settings());

function settings() {
    return {
        consumeJobResults: false, // default: true
        prefix: 'staging_', // prepend queue with prefix
    };
}
```

1. declare queue (queue-schema.js)

  ```
qc.registerQueue('fruits', {durable: false}); // configure queue here
```

2. declare channel(s) (queue-schema.js)

  ```javascript
  var apple = qc.channel({name: 'apple', input: 'fruits'}); // RPC
  var orange = qc.channel({name: 'orange', input: 'fruits', output: 'results'}); // remote job
  ```

3. on server (server.js)

  ```javascript
  apple.onServer(function(args, done) {
      done(null, 'yummy ' + args.name);
  });
  ```

4. on client: remote call (client-rpc.js)

  ```javascript
  // register call
  var sendToAppleQueue = apple.onClient();
  // make a call
  sendToAppleQueue({name: 'golden apple'}).then(function(response) {
      console.log(response); // yummy golden apple
  });
  ```

5. on client: remote job (client-job.js)

  ```javascript
  // register job
  var sendToOrangeQueue = orange.onClient(function(err, res, next){
      console.log(res); // yummy sweet orange
      next();
  });
  // post a job
  sendToOrangeQueue({name: 'sweet orange'}); // note that callback will not be called
```
