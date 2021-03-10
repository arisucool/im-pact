# @arisucool/im-pact-action-share-on-discord

[Action](https://www.npmjs.com/search?q=keywords%3Aim-pact-action) for [im pact](https://github.com/arisucool/im-pact).
This action allows you to share tweets on Discord.

---

## Usage

This action is built-in to the im pact.
Therefore, no steps are needed to use it.

---

## For Developers

### Testing

Testing on Docker Compose (recommends if you running the [development environment](https://github.com/arisucool/im-pact/wiki/Dev-StartGuide)):

```
$ sudo docker-compose exec -w /opt/app/module_packages/im-pact-action-share-on-discord/ app npm test -- --watchAll
```

Testing on standalone:

```
$ cd module_packages/im-pact-action-share-on-discord/
$ npm install
$ npm test -- --watchAll
```

---

## License

Copyright (C) 2021 arisu.cool 🍓 Project (https://github.com/arisucool/).
This software is released under the MIT License.
