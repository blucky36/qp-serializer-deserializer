const x = {
  'me': 'test',
  'just': 1,
  'make': null,
  'up': undefined,
  'something': ['1'],
  'like': [1],
  'this': true,
  'and': false,
  'then': new Date(),
  'use': [['1']],
  'tigercase': [{'1':null}],
  'to': {
    'me': 'test',
    'just': 1,
    'make': null,
    'up': undefined,
    'something': ['1'],
    'like': [1],
    'this': true,
    'and': false,
    'then': new Date(),
    'use': [['1']],
    'tigercase': [{ '1': null }],
  }
}

const keySerializeRegex = /([=~:@$/])/g;
const valueSerializeRegex = /([&;/])/g;
const keyDeserializeRegex = /[=~:@$]/;
const valueDeserializeRegex = /[&;]/;

const encodeString = (str, regexp) => {
  return encodeURI(str.replace(regexp, '/$1'))
}

const trim = (res) => {
  return typeof res === 'string' ? res.replace(/;+$/g, '') : res
}


/**
 * Serialize turns json (with dates added) into parseable and sharable query parameters.
 * Pros
 * - Allows state management via query parameters for cross session sharing.
 * - Allows for complex json including dates.
 * - Easily deserialized programmatically.
 * - Allows for nested data structures.
 * Cons
 * - not very readable or human constructable.
 * - not very usable on a parameter by parameter basis.
 * - requires a full deserialization before usable.
 * @param {{ [key: string]: Date | string | boolean | undefined | null | Object | Array }} input
 * @param { Boolean } isRecursive While true indicates that this function call
 * is within the main function call
 */
const serialize = (input, isRecursive = false) => {
  if (!isRecursive) {
    return trim(serialize(input, true))
  }

  // Number, Boolean or Null
  if (typeof input === 'number' || typeof input === 'boolean' || input === null) {
    return ':' + input
  }
  const res = []

  // Array
  if (input instanceof Array) {
    for (let i = 0; i < input.length; ++i) {
      typeof input[i] === 'undefined'
        ? res.push(':null')
        : res.push(serialize(input[i], true))
    }
    return '@' + res.join('&') + ';'
  }

  // Date
  if (input instanceof Date) {
    return '~' + encodeString(input.toISOString(), valueSerializeRegex);
  }

  // Object
  if (typeof input === 'object') {
    for (const key in input) {
      const val = serialize(input[key], true)
      if (val) {
        res.push(encodeString(key, keySerializeRegex) + val)
      }
    }
    return '$' + res.join('&') + ';'
  }

  // Omit Undefined
  if (typeof input === 'undefined') {
    return
  }

  // String
  return '=' + encodeString(input.toString(), valueSerializeRegex)
}

/**
 * Deserialize uses a LL parser pattern (left to right) into a  non backtracking
 * recursive descent parser pattern for nested data types.
 * @param {string} str Serialized query parameter string.
 */
const deserialize = (str) => {
  var pos = 0
  str = decodeURI(str)

  function readToken (regexp) {
    var token = ''
    for (; pos !== str.length; ++pos) {
      if (str.charAt(pos) === '/') {
        pos += 1
        if (pos === str.length) {
          token += ';'
          break
        }
      } else if (str.charAt(pos).match(regexp)) {
        break
      }
      token += str.charAt(pos)
    }
    return token
  }

  function parseToken () {
    var type = str.charAt(pos++)

    // String
    if (type === '=') {
      return readToken(valueDeserializeRegex)
    }

    // Number, Boolean or Null
    if (type === ':') {
      var value = readToken(valueDeserializeRegex)
      if (value === 'true') {
        return true
      }
      if (value === 'false') {
        return false
      }
      value = parseFloat(value)
      return isNaN(value) ? null : value
    }
    var res

    // Array
    if (type === '@') {
      res = []
      // Allows us to enclose stepping through a serialized array until we see the breaking char.
      steppingClosure: {
        // Handles empty array case.
        if (pos >= str.length || str.charAt(pos) === ';') {
          break steppingClosure
        }

        // Step through array items until `;`
        while (true) {
          res.push(parseToken())
          if (pos >= str.length || str.charAt(pos) === ';') {
            break steppingClosure
          }
          pos += 1
        }
      }
      pos += 1
      return res
    }

    // Date
    if (type === '~') {
      return new Date(readToken(valueDeserializeRegex))
    }

    // Object
    if (type === '$') {
      res = {}
      // Allows us to enclose stepping through a serialized object until we see the breaking char.
      setppingClosure: {
        if (pos >= str.length || str.charAt(pos) === ';') {
          break setppingClosure
        }
        while (1) {
          var name = readToken(keyDeserializeRegex)
          res[name] = parseToken()
          if (pos >= str.length || str.charAt(pos) === ';') {
            break setppingClosure
          }
          pos += 1
        }
      }
      pos += 1
      return res
    }

    // Breaks attempted deserialization when results will be corrupt due to user input.
    throw new Error('Unexpected char ' + type)
  }

  return parseToken()
}


console.log(x)
console.log(serialize(x))
console.log(deserialize(serialize(x)))
console.log(serialize(deserialize(serialize(x))))
console.log(deserialize(serialize(deserialize(serialize(x)))))
