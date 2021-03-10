# @arisucool/im-pact-filter-tweet-sensitive-flag

[Tweet Filter](https://www.npmjs.com/search?q=keywords%3Aim-pact-filter) for [im pact](https://github.com/arisucool/im-pact).
This tweet filter allows you to extract the tweets, depend on whether the sensitive content flag (that provided by Twitter) of each tweet is safe.

---

## Usage

This tweet filter is built-in to the im pact.
Therefore, no steps are needed to use it.

---

## For Developers

### Testing

Testing on Docker Compose (recommends if you running the [development environment](https://github.com/arisucool/im-pact/wiki/Dev-StartGuide)):

```
$ sudo docker-compose exec -w /opt/app/module_packages/im-pact-filter-tweet-sensitive-flag/ app npm test -- --watchAll
```

Testing on standalone:

```
$ cd module_packages/im-pact-filter-tweet-sensitive-flag/
$ npm install
$ npm test -- --watchAll
```

---

## License

Copyright (C) 2021 arisu.cool 🍓 Project (https://github.com/arisucool/).
This software is released under the MIT License.
