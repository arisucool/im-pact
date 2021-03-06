# @arisucool/im-pact-filter-profile-like-follower-bayesian

[Tweet Filter](https://www.npmjs.com/search?q=keywords%3Aim-pact-filter) for [im pact](https://github.com/arisucool/im-pact).
This tweet filter allows you to extract the tweets, based on whether the author's profile of each tweet is close to your followers.

---

## Usage

This tweet filter is built-in to the im pact.
Therefore, no steps are needed to use it.

---

## For Developers

### Testing

Testing on Docker Compose (recommends if you running the [development environment](https://github.com/arisucool/im-pact/wiki/Dev-StartGuide)):

```
$ sudo docker-compose exec -w /opt/app/module_packages/im-pact-filter-profile-like-follower-bayesian/ app npm test -- --watchAll
```

Testing on standalone:

```
$ cd module_packages/im-pact-filter-profile-like-follower-bayesian/
$ npm install
$ npm test -- --watchAll
```

---

## License

Copyright (C) 2021 arisu.cool 🍓 Project (https://github.com/arisucool/).
This software is released under the MIT License.
