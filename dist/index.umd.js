(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.fixWebmMetainfo = factory());
})(this, (function () { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getAugmentedNamespace(n) {
	  var f = n.default;
		if (typeof f == "function") {
			var a = function () {
				return f.apply(this, arguments);
			};
			a.prototype = f.prototype;
	  } else a = {};
	  Object.defineProperty(a, '__esModule', {value: true});
		Object.keys(n).forEach(function (k) {
			var d = Object.getOwnPropertyDescriptor(n, k);
			Object.defineProperty(a, k, d.get ? d : {
				enumerable: true,
				get: function () {
					return n[k];
				}
			});
		});
		return a;
	}

	var lib = {};

	var EBMLDecoder$2 = {};

	var tools$4 = {};

	var global$1 = (typeof global !== "undefined" ? global :
	  typeof self !== "undefined" ? self :
	  typeof window !== "undefined" ? window : {});

	var lookup$1 = [];
	var revLookup$1 = [];
	var Arr$1 = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
	var inited = false;
	function init () {
	  inited = true;
	  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	  for (var i = 0, len = code.length; i < len; ++i) {
	    lookup$1[i] = code[i];
	    revLookup$1[code.charCodeAt(i)] = i;
	  }

	  revLookup$1['-'.charCodeAt(0)] = 62;
	  revLookup$1['_'.charCodeAt(0)] = 63;
	}

	function toByteArray$1 (b64) {
	  if (!inited) {
	    init();
	  }
	  var i, j, l, tmp, placeHolders, arr;
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // the number of equal signs (place holders)
	  // if there are two placeholders, than the two characters before it
	  // represent one byte
	  // if there is only one, then the three characters before it represent 2 bytes
	  // this is just a cheap hack to not do indexOf twice
	  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

	  // base64 is 4/3 + up to two characters of the original data
	  arr = new Arr$1(len * 3 / 4 - placeHolders);

	  // if there are placeholders, only get up to the last complete 4 chars
	  l = placeHolders > 0 ? len - 4 : len;

	  var L = 0;

	  for (i = 0, j = 0; i < l; i += 4, j += 3) {
	    tmp = (revLookup$1[b64.charCodeAt(i)] << 18) | (revLookup$1[b64.charCodeAt(i + 1)] << 12) | (revLookup$1[b64.charCodeAt(i + 2)] << 6) | revLookup$1[b64.charCodeAt(i + 3)];
	    arr[L++] = (tmp >> 16) & 0xFF;
	    arr[L++] = (tmp >> 8) & 0xFF;
	    arr[L++] = tmp & 0xFF;
	  }

	  if (placeHolders === 2) {
	    tmp = (revLookup$1[b64.charCodeAt(i)] << 2) | (revLookup$1[b64.charCodeAt(i + 1)] >> 4);
	    arr[L++] = tmp & 0xFF;
	  } else if (placeHolders === 1) {
	    tmp = (revLookup$1[b64.charCodeAt(i)] << 10) | (revLookup$1[b64.charCodeAt(i + 1)] << 4) | (revLookup$1[b64.charCodeAt(i + 2)] >> 2);
	    arr[L++] = (tmp >> 8) & 0xFF;
	    arr[L++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64$1 (num) {
	  return lookup$1[num >> 18 & 0x3F] + lookup$1[num >> 12 & 0x3F] + lookup$1[num >> 6 & 0x3F] + lookup$1[num & 0x3F]
	}

	function encodeChunk$1 (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
	    output.push(tripletToBase64$1(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray$1 (uint8) {
	  if (!inited) {
	    init();
	  }
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var output = '';
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk$1(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    output += lookup$1[tmp >> 2];
	    output += lookup$1[(tmp << 4) & 0x3F];
	    output += '==';
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
	    output += lookup$1[tmp >> 10];
	    output += lookup$1[(tmp >> 4) & 0x3F];
	    output += lookup$1[(tmp << 2) & 0x3F];
	    output += '=';
	  }

	  parts.push(output);

	  return parts.join('')
	}

	function read (buffer, offset, isLE, mLen, nBytes) {
	  var e, m;
	  var eLen = nBytes * 8 - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var nBits = -7;
	  var i = isLE ? (nBytes - 1) : 0;
	  var d = isLE ? -1 : 1;
	  var s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	function write (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c;
	  var eLen = nBytes * 8 - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
	  var i = isLE ? 0 : (nBytes - 1);
	  var d = isLE ? 1 : -1;
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128;
	}

	var toString = {}.toString;

	var isArray = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var INSPECT_MAX_BYTES = 50;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
	  ? global$1.TYPED_ARRAY_SUPPORT
	  : true;

	/*
	 * Export kMaxLength after typed array support is determined.
	 */
	var _kMaxLength = kMaxLength();

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	function createBuffer (that, length) {
	  if (kMaxLength() < length) {
	    throw new RangeError('Invalid typed array length')
	  }
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = new Uint8Array(length);
	    that.__proto__ = Buffer.prototype;
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    if (that === null) {
	      that = new Buffer(length);
	    }
	    that.length = length;
	  }

	  return that
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
	    return new Buffer(arg, encodingOrOffset, length)
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new Error(
	        'If encoding is specified then the first argument must be a string'
	      )
	    }
	    return allocUnsafe(this, arg)
	  }
	  return from(this, arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192; // not used by this implementation

	// TODO: Legacy, not needed anymore. Remove in next major version.
	Buffer._augment = function (arr) {
	  arr.__proto__ = Buffer.prototype;
	  return arr
	};

	function from (that, value, encodingOrOffset, length) {
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    return fromArrayBuffer(that, value, encodingOrOffset, length)
	  }

	  if (typeof value === 'string') {
	    return fromString(that, value, encodingOrOffset)
	  }

	  return fromObject(that, value)
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(null, value, encodingOrOffset, length)
	};

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype;
	  Buffer.__proto__ = Uint8Array;
	}

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be a number')
	  } else if (size < 0) {
	    throw new RangeError('"size" argument must not be negative')
	  }
	}

	function alloc (that, size, fill, encoding) {
	  assertSize(size);
	  if (size <= 0) {
	    return createBuffer(that, size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpretted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(that, size).fill(fill, encoding)
	      : createBuffer(that, size).fill(fill)
	  }
	  return createBuffer(that, size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(null, size, fill, encoding)
	};

	function allocUnsafe (that, size) {
	  assertSize(size);
	  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < size; ++i) {
	      that[i] = 0;
	    }
	  }
	  return that
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(null, size)
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(null, size)
	};

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8';
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('"encoding" must be a valid string encoding')
	  }

	  var length = byteLength$1(string, encoding) | 0;
	  that = createBuffer(that, length);

	  var actual = that.write(string, encoding);

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    that = that.slice(0, actual);
	  }

	  return that
	}

	function fromArrayLike (that, array) {
	  var length = array.length < 0 ? 0 : checked(array.length) | 0;
	  that = createBuffer(that, length);
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255;
	  }
	  return that
	}

	function fromArrayBuffer (that, array, byteOffset, length) {
	  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('\'offset\' is out of bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('\'length\' is out of bounds')
	  }

	  if (byteOffset === undefined && length === undefined) {
	    array = new Uint8Array(array);
	  } else if (length === undefined) {
	    array = new Uint8Array(array, byteOffset);
	  } else {
	    array = new Uint8Array(array, byteOffset, length);
	  }

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = array;
	    that.__proto__ = Buffer.prototype;
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromArrayLike(that, array);
	  }
	  return that
	}

	function fromObject (that, obj) {
	  if (internalIsBuffer(obj)) {
	    var len = checked(obj.length) | 0;
	    that = createBuffer(that, len);

	    if (that.length === 0) {
	      return that
	    }

	    obj.copy(that, 0, 0, len);
	    return that
	  }

	  if (obj) {
	    if ((typeof ArrayBuffer !== 'undefined' &&
	        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
	      if (typeof obj.length !== 'number' || isnan(obj.length)) {
	        return createBuffer(that, 0)
	      }
	      return fromArrayLike(that, obj)
	    }

	    if (obj.type === 'Buffer' && isArray(obj.data)) {
	      return fromArrayLike(that, obj.data)
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength()` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0;
	  }
	  return Buffer.alloc(+length)
	}
	Buffer.isBuffer = isBuffer;
	function internalIsBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length;
	  var y = b.length;

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	};

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  var i;
	  if (length === undefined) {
	    length = 0;
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length;
	    }
	  }

	  var buffer = Buffer.allocUnsafe(length);
	  var pos = 0;
	  for (i = 0; i < list.length; ++i) {
	    var buf = list[i];
	    if (!internalIsBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    }
	    buf.copy(buffer, pos);
	    pos += buf.length;
	  }
	  return buffer
	};

	function byteLength$1 (string, encoding) {
	  if (internalIsBuffer(string)) {
	    return string.length
	  }
	  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
	      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    string = '' + string;
	  }

	  var len = string.length;
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	      case undefined:
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	}
	Buffer.byteLength = byteLength$1;

	function slowToString (encoding, start, end) {
	  var loweredCase = false;

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0;
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length;
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0;
	  start >>>= 0;

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8';

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase();
	        loweredCase = true;
	    }
	  }
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true;

	function swap (b, n, m) {
	  var i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16 () {
	  var len = this.length;
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (var i = 0; i < len; i += 2) {
	    swap(this, i, i + 1);
	  }
	  return this
	};

	Buffer.prototype.swap32 = function swap32 () {
	  var len = this.length;
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (var i = 0; i < len; i += 4) {
	    swap(this, i, i + 3);
	    swap(this, i + 1, i + 2);
	  }
	  return this
	};

	Buffer.prototype.swap64 = function swap64 () {
	  var len = this.length;
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (var i = 0; i < len; i += 8) {
	    swap(this, i, i + 7);
	    swap(this, i + 1, i + 6);
	    swap(this, i + 2, i + 5);
	    swap(this, i + 3, i + 4);
	  }
	  return this
	};

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0;
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	};

	Buffer.prototype.equals = function equals (b) {
	  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	};

	Buffer.prototype.inspect = function inspect () {
	  var str = '';
	  var max = INSPECT_MAX_BYTES;
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
	    if (this.length > max) str += ' ... ';
	  }
	  return '<Buffer ' + str + '>'
	};

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (!internalIsBuffer(target)) {
	    throw new TypeError('Argument must be a Buffer')
	  }

	  if (start === undefined) {
	    start = 0;
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0;
	  }
	  if (thisStart === undefined) {
	    thisStart = 0;
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length;
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0;
	  end >>>= 0;
	  thisStart >>>= 0;
	  thisEnd >>>= 0;

	  if (this === target) return 0

	  var x = thisEnd - thisStart;
	  var y = end - start;
	  var len = Math.min(x, y);

	  var thisCopy = this.slice(thisStart, thisEnd);
	  var targetCopy = target.slice(start, end);

	  for (var i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i];
	      y = targetCopy[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset;
	    byteOffset = 0;
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff;
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000;
	  }
	  byteOffset = +byteOffset;  // Coerce to Number.
	  if (isNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1);
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1;
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0;
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding);
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (internalIsBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF; // Search for a byte value [0-255]
	    if (Buffer.TYPED_ARRAY_SUPPORT &&
	        typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  var indexSize = 1;
	  var arrLength = arr.length;
	  var valLength = val.length;

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase();
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2;
	      arrLength /= 2;
	      valLength /= 2;
	      byteOffset /= 2;
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  var i;
	  if (dir) {
	    var foundIndex = -1;
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i;
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex;
	        foundIndex = -1;
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
	    for (i = byteOffset; i >= 0; i--) {
	      var found = true;
	      for (var j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false;
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	};

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	};

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0;
	  var remaining = buf.length - offset;
	  if (!length) {
	    length = remaining;
	  } else {
	    length = Number(length);
	    if (length > remaining) {
	      length = remaining;
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length;
	  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2;
	  }
	  for (var i = 0; i < length; ++i) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16);
	    if (isNaN(parsed)) return i
	    buf[offset + i] = parsed;
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function latin1Write (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8';
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset;
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0;
	    if (isFinite(length)) {
	      length = length | 0;
	      if (encoding === undefined) encoding = 'utf8';
	    } else {
	      encoding = length;
	      length = undefined;
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  var remaining = this.length - offset;
	  if (length === undefined || length > remaining) length = remaining;

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8';

	  var loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'latin1':
	      case 'binary':
	        return latin1Write(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	};

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	};

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return fromByteArray$1(buf)
	  } else {
	    return fromByteArray$1(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end);
	  var res = [];

	  var i = start;
	  while (i < end) {
	    var firstByte = buf[i];
	    var codePoint = null;
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1;

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint;

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte;
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1];
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          fourthByte = buf[i + 3];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint;
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD;
	      bytesPerSequence = 1;
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000;
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
	      codePoint = 0xDC00 | codePoint & 0x3FF;
	    }

	    res.push(codePoint);
	    i += bytesPerSequence;
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length;
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = '';
	  var i = 0;
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    );
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = '';
	  end = Math.min(buf.length, end);

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F);
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  var ret = '';
	  end = Math.min(buf.length, end);

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i]);
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length;

	  if (!start || start < 0) start = 0;
	  if (!end || end < 0 || end > len) end = len;

	  var out = '';
	  for (var i = start; i < end; ++i) {
	    out += toHex(buf[i]);
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end);
	  var res = '';
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length;
	  start = ~~start;
	  end = end === undefined ? len : ~~end;

	  if (start < 0) {
	    start += len;
	    if (start < 0) start = 0;
	  } else if (start > len) {
	    start = len;
	  }

	  if (end < 0) {
	    end += len;
	    if (end < 0) end = 0;
	  } else if (end > len) {
	    end = len;
	  }

	  if (end < start) end = start;

	  var newBuf;
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = this.subarray(start, end);
	    newBuf.__proto__ = Buffer.prototype;
	  } else {
	    var sliceLen = end - start;
	    newBuf = new Buffer(sliceLen, undefined);
	    for (var i = 0; i < sliceLen; ++i) {
	      newBuf[i] = this[i + start];
	    }
	  }

	  return newBuf
	};

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  var val = this[offset];
	  var mul = 1;
	  var i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length);
	  }

	  var val = this[offset + --byteLength];
	  var mul = 1;
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  return this[offset]
	};

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return this[offset] | (this[offset + 1] << 8)
	};

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return (this[offset] << 8) | this[offset + 1]
	};

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	};

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	};

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  var val = this[offset];
	  var mul = 1;
	  var i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  var i = byteLength;
	  var mul = 1;
	  var val = this[offset + --i];
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	};

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  var val = this[offset] | (this[offset + 1] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  var val = this[offset + 1] | (this[offset] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	};

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	};

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return read(this, offset, true, 23, 4)
	};

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return read(this, offset, false, 23, 4)
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return read(this, offset, true, 52, 8)
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return read(this, offset, false, 52, 8)
	};

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  var mul = 1;
	  var i = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  byteLength = byteLength | 0;
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  var i = byteLength - 1;
	  var mul = 1;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1;
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8;
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff);
	    this[offset + 1] = (value >>> 8);
	  } else {
	    objectWriteUInt16(this, value, offset, true);
	  }
	  return offset + 2
	};

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8);
	    this[offset + 1] = (value & 0xff);
	  } else {
	    objectWriteUInt16(this, value, offset, false);
	  }
	  return offset + 2
	};

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1;
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24);
	    this[offset + 2] = (value >>> 16);
	    this[offset + 1] = (value >>> 8);
	    this[offset] = (value & 0xff);
	  } else {
	    objectWriteUInt32(this, value, offset, true);
	  }
	  return offset + 4
	};

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24);
	    this[offset + 1] = (value >>> 16);
	    this[offset + 2] = (value >>> 8);
	    this[offset + 3] = (value & 0xff);
	  } else {
	    objectWriteUInt32(this, value, offset, false);
	  }
	  return offset + 4
	};

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  var i = 0;
	  var mul = 1;
	  var sub = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  var i = byteLength - 1;
	  var mul = 1;
	  var sub = 0;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
	  if (value < 0) value = 0xff + value + 1;
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff);
	    this[offset + 1] = (value >>> 8);
	  } else {
	    objectWriteUInt16(this, value, offset, true);
	  }
	  return offset + 2
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8);
	    this[offset + 1] = (value & 0xff);
	  } else {
	    objectWriteUInt16(this, value, offset, false);
	  }
	  return offset + 2
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff);
	    this[offset + 1] = (value >>> 8);
	    this[offset + 2] = (value >>> 16);
	    this[offset + 3] = (value >>> 24);
	  } else {
	    objectWriteUInt32(this, value, offset, true);
	  }
	  return offset + 4
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset | 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (value < 0) value = 0xffffffff + value + 1;
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24);
	    this[offset + 1] = (value >>> 16);
	    this[offset + 2] = (value >>> 8);
	    this[offset + 3] = (value & 0xff);
	  } else {
	    objectWriteUInt32(this, value, offset, false);
	  }
	  return offset + 4
	};

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4);
	  }
	  write(buf, value, offset, littleEndian, 23, 4);
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	};

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8);
	  }
	  write(buf, value, offset, littleEndian, 52, 8);
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0;
	  if (!end && end !== 0) end = this.length;
	  if (targetStart >= target.length) targetStart = target.length;
	  if (!targetStart) targetStart = 0;
	  if (end > 0 && end < start) end = start;

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length;
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start;
	  }

	  var len = end - start;
	  var i;

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; --i) {
	      target[i + targetStart] = this[i + start];
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; ++i) {
	      target[i + targetStart] = this[i + start];
	    }
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, start + len),
	      targetStart
	    );
	  }

	  return len
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start;
	      start = 0;
	      end = this.length;
	    } else if (typeof end === 'string') {
	      encoding = end;
	      end = this.length;
	    }
	    if (val.length === 1) {
	      var code = val.charCodeAt(0);
	      if (code < 256) {
	        val = code;
	      }
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255;
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0;
	  end = end === undefined ? this.length : end >>> 0;

	  if (!val) val = 0;

	  var i;
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val;
	    }
	  } else {
	    var bytes = internalIsBuffer(val)
	      ? val
	      : utf8ToBytes(new Buffer(val, encoding).toString());
	    var len = bytes.length;
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len];
	    }
	  }

	  return this
	};

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '=';
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity;
	  var codePoint;
	  var length = string.length;
	  var leadSurrogate = null;
	  var bytes = [];

	  for (var i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i);

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint;

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	        leadSurrogate = codePoint;
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	    }

	    leadSurrogate = null;

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint);
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = [];
	  for (var i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF);
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo;
	  var byteArray = [];
	  for (var i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i);
	    hi = c >> 8;
	    lo = c % 256;
	    byteArray.push(lo);
	    byteArray.push(hi);
	  }

	  return byteArray
	}


	function base64ToBytes (str) {
	  return toByteArray$1(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i];
	  }
	  return i
	}

	function isnan (val) {
	  return val !== val // eslint-disable-line no-self-compare
	}


	// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
	// The _isBuffer check is for Safari 5-7 support, because it's missing
	// Object.prototype.constructor. Remove this eventually
	function isBuffer(obj) {
	  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
	}

	function isFastBuffer (obj) {
	  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
	}

	// For Node v0.10 support. Remove this eventually.
	function isSlowBuffer (obj) {
	  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
	}

	var _polyfillNode_buffer = /*#__PURE__*/Object.freeze({
		__proto__: null,
		Buffer: Buffer,
		INSPECT_MAX_BYTES: INSPECT_MAX_BYTES,
		SlowBuffer: SlowBuffer,
		isBuffer: isBuffer,
		kMaxLength: _kMaxLength
	});

	var int64Buffer = {};

	(function (exports) {

		!function(exports) {
		  // constants

		  var UNDEFINED = "undefined";
		  var BUFFER = (UNDEFINED !== typeof Buffer) && Buffer;
		  var UINT8ARRAY = (UNDEFINED !== typeof Uint8Array) && Uint8Array;
		  var ARRAYBUFFER = (UNDEFINED !== typeof ArrayBuffer) && ArrayBuffer;
		  var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];
		  var isArray = Array.isArray || _isArray;
		  var BIT32 = 4294967296;
		  var BIT24 = 16777216;

		  // storage class

		  var storage; // Array;

		  // generate classes

		  factory("Uint64BE", true, true);
		  factory("Int64BE", true, false);
		  factory("Uint64LE", false, true);
		  factory("Int64LE", false, false);

		  // class factory

		  function factory(name, bigendian, unsigned) {
		    var posH = bigendian ? 0 : 4;
		    var posL = bigendian ? 4 : 0;
		    var pos0 = bigendian ? 0 : 3;
		    var pos1 = bigendian ? 1 : 2;
		    var pos2 = bigendian ? 2 : 1;
		    var pos3 = bigendian ? 3 : 0;
		    var fromPositive = bigendian ? fromPositiveBE : fromPositiveLE;
		    var fromNegative = bigendian ? fromNegativeBE : fromNegativeLE;
		    var proto = Int64.prototype;
		    var isName = "is" + name;
		    var _isInt64 = "_" + isName;

		    // properties
		    proto.buffer = void 0;
		    proto.offset = 0;
		    proto[_isInt64] = true;

		    // methods
		    proto.toNumber = toNumber;
		    proto.toString = toString;
		    proto.toJSON = toNumber;
		    proto.toArray = toArray;

		    // add .toBuffer() method only when Buffer available
		    if (BUFFER) proto.toBuffer = toBuffer;

		    // add .toArrayBuffer() method only when Uint8Array available
		    if (UINT8ARRAY) proto.toArrayBuffer = toArrayBuffer;

		    // isUint64BE, isInt64BE
		    Int64[isName] = isInt64;

		    // CommonJS
		    exports[name] = Int64;

		    return Int64;

		    // constructor
		    function Int64(buffer, offset, value, raddix) {
		      if (!(this instanceof Int64)) return new Int64(buffer, offset, value, raddix);
		      return init(this, buffer, offset, value, raddix);
		    }

		    // isUint64BE, isInt64BE
		    function isInt64(b) {
		      return !!(b && b[_isInt64]);
		    }

		    // initializer
		    function init(that, buffer, offset, value, raddix) {
		      if (UINT8ARRAY && ARRAYBUFFER) {
		        if (buffer instanceof ARRAYBUFFER) buffer = new UINT8ARRAY(buffer);
		        if (value instanceof ARRAYBUFFER) value = new UINT8ARRAY(value);
		      }

		      // Int64BE() style
		      if (!buffer && !offset && !value && !storage) {
		        // shortcut to initialize with zero
		        that.buffer = newArray(ZERO, 0);
		        return;
		      }

		      // Int64BE(value, raddix) style
		      if (!isValidBuffer(buffer, offset)) {
		        var _storage = storage || Array;
		        raddix = offset;
		        value = buffer;
		        offset = 0;
		        buffer = new _storage(8);
		      }

		      that.buffer = buffer;
		      that.offset = offset |= 0;

		      // Int64BE(buffer, offset) style
		      if (UNDEFINED === typeof value) return;

		      // Int64BE(buffer, offset, value, raddix) style
		      if ("string" === typeof value) {
		        fromString(buffer, offset, value, raddix || 10);
		      } else if (isValidBuffer(value, raddix)) {
		        fromArray(buffer, offset, value, raddix);
		      } else if ("number" === typeof raddix) {
		        writeInt32(buffer, offset + posH, value); // high
		        writeInt32(buffer, offset + posL, raddix); // low
		      } else if (value > 0) {
		        fromPositive(buffer, offset, value); // positive
		      } else if (value < 0) {
		        fromNegative(buffer, offset, value); // negative
		      } else {
		        fromArray(buffer, offset, ZERO, 0); // zero, NaN and others
		      }
		    }

		    function fromString(buffer, offset, str, raddix) {
		      var pos = 0;
		      var len = str.length;
		      var high = 0;
		      var low = 0;
		      if (str[0] === "-") pos++;
		      var sign = pos;
		      while (pos < len) {
		        var chr = parseInt(str[pos++], raddix);
		        if (!(chr >= 0)) break; // NaN
		        low = low * raddix + chr;
		        high = high * raddix + Math.floor(low / BIT32);
		        low %= BIT32;
		      }
		      if (sign) {
		        high = ~high;
		        if (low) {
		          low = BIT32 - low;
		        } else {
		          high++;
		        }
		      }
		      writeInt32(buffer, offset + posH, high);
		      writeInt32(buffer, offset + posL, low);
		    }

		    function toNumber() {
		      var buffer = this.buffer;
		      var offset = this.offset;
		      var high = readInt32(buffer, offset + posH);
		      var low = readInt32(buffer, offset + posL);
		      if (!unsigned) high |= 0; // a trick to get signed
		      return high ? (high * BIT32 + low) : low;
		    }

		    function toString(radix) {
		      var buffer = this.buffer;
		      var offset = this.offset;
		      var high = readInt32(buffer, offset + posH);
		      var low = readInt32(buffer, offset + posL);
		      var str = "";
		      var sign = !unsigned && (high & 0x80000000);
		      if (sign) {
		        high = ~high;
		        low = BIT32 - low;
		      }
		      radix = radix || 10;
		      while (1) {
		        var mod = (high % radix) * BIT32 + low;
		        high = Math.floor(high / radix);
		        low = Math.floor(mod / radix);
		        str = (mod % radix).toString(radix) + str;
		        if (!high && !low) break;
		      }
		      if (sign) {
		        str = "-" + str;
		      }
		      return str;
		    }

		    function writeInt32(buffer, offset, value) {
		      buffer[offset + pos3] = value & 255;
		      value = value >> 8;
		      buffer[offset + pos2] = value & 255;
		      value = value >> 8;
		      buffer[offset + pos1] = value & 255;
		      value = value >> 8;
		      buffer[offset + pos0] = value & 255;
		    }

		    function readInt32(buffer, offset) {
		      return (buffer[offset + pos0] * BIT24) +
		        (buffer[offset + pos1] << 16) +
		        (buffer[offset + pos2] << 8) +
		        buffer[offset + pos3];
		    }
		  }

		  function toArray(raw) {
		    var buffer = this.buffer;
		    var offset = this.offset;
		    storage = null; // Array
		    if (raw !== false && offset === 0 && buffer.length === 8 && isArray(buffer)) return buffer;
		    return newArray(buffer, offset);
		  }

		  function toBuffer(raw) {
		    var buffer = this.buffer;
		    var offset = this.offset;
		    storage = BUFFER;
		    if (raw !== false && offset === 0 && buffer.length === 8 && Buffer.isBuffer(buffer)) return buffer;
		    var dest = new BUFFER(8);
		    fromArray(dest, 0, buffer, offset);
		    return dest;
		  }

		  function toArrayBuffer(raw) {
		    var buffer = this.buffer;
		    var offset = this.offset;
		    var arrbuf = buffer.buffer;
		    storage = UINT8ARRAY;
		    if (raw !== false && offset === 0 && (arrbuf instanceof ARRAYBUFFER) && arrbuf.byteLength === 8) return arrbuf;
		    var dest = new UINT8ARRAY(8);
		    fromArray(dest, 0, buffer, offset);
		    return dest.buffer;
		  }

		  function isValidBuffer(buffer, offset) {
		    var len = buffer && buffer.length;
		    offset |= 0;
		    return len && (offset + 8 <= len) && ("string" !== typeof buffer[offset]);
		  }

		  function fromArray(destbuf, destoff, srcbuf, srcoff) {
		    destoff |= 0;
		    srcoff |= 0;
		    for (var i = 0; i < 8; i++) {
		      destbuf[destoff++] = srcbuf[srcoff++] & 255;
		    }
		  }

		  function newArray(buffer, offset) {
		    return Array.prototype.slice.call(buffer, offset, offset + 8);
		  }

		  function fromPositiveBE(buffer, offset, value) {
		    var pos = offset + 8;
		    while (pos > offset) {
		      buffer[--pos] = value & 255;
		      value /= 256;
		    }
		  }

		  function fromNegativeBE(buffer, offset, value) {
		    var pos = offset + 8;
		    value++;
		    while (pos > offset) {
		      buffer[--pos] = ((-value) & 255) ^ 255;
		      value /= 256;
		    }
		  }

		  function fromPositiveLE(buffer, offset, value) {
		    var end = offset + 8;
		    while (offset < end) {
		      buffer[offset++] = value & 255;
		      value /= 256;
		    }
		  }

		  function fromNegativeLE(buffer, offset, value) {
		    var end = offset + 8;
		    value++;
		    while (offset < end) {
		      buffer[offset++] = ((-value) & 255) ^ 255;
		      value /= 256;
		    }
		  }

		  // https://github.com/retrofox/is-array
		  function _isArray(val) {
		    return !!val && "[object Array]" == Object.prototype.toString.call(val);
		  }

		}(typeof exports.nodeName !== 'string' ? exports : (commonjsGlobal || {}));
	} (int64Buffer));

	var EBMLEncoder = {};

	/*jslint node: true, vars: true, nomen: true */

	var byEbmlID$2 = {
		0x80: {
			name: "ChapterDisplay",
			level: 4,
			type: "m",
			multiple: true,
			webm: true,
			description: "Contains all possible strings to use for the chapter display."
		},
		0x83: {
			name: "TrackType",
			level: 3,
			type: "u",
			mandatory: true,
			description: "The `TrackType` defines the type of each frame found in the Track. The value **SHOULD** be stored on 1 octet."
		},
		0x85: {
			name: "ChapString",
			cppname: "ChapterString",
			level: 5,
			type: "8",
			mandatory: true,
			webm: true,
			description: "Contains the string to use as the chapter atom."
		},
		0x86: {
			name: "CodecID",
			level: 3,
			type: "s",
			mandatory: true,
			description: "An ID corresponding to the codec, see [@!MatroskaCodec] for more info."
		},
		0x88: {
			name: "FlagDefault",
			cppname: "TrackFlagDefault",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "1",
			range: "0-1",
			description: "Set if that track (audio, video or subs) **SHOULD** be eligible for automatic selection by the player; see (#default-track-selection) for more details."
		},
		0x89: {
			name: "ChapterTrackUID",
			cppname: "ChapterTrackNumber",
			level: 5,
			type: "u",
			mandatory: true,
			multiple: true,
			range: "not 0",
			description: "UID of the Track to apply this chapter to. In the absence of a control track, choosing this chapter will select the listed Tracks and deselect unlisted tracks. Absence of this Element indicates that the Chapter **SHOULD** be applied to any currently used Tracks."
		},
		0x8e: {
			name: "Slices",
			level: 3,
			type: "m",
			maxver: 1,
			description: "Contains slices description."
		},
		0x8f: {
			name: "ChapterTrack",
			level: 4,
			type: "m",
			description: "List of tracks on which the chapter applies. If this Element is not present, all tracks apply"
		},
		0x91: {
			name: "ChapterTimeStart",
			level: 4,
			type: "u",
			mandatory: true,
			webm: true,
			description: "Timestamp of the start of Chapter, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks)."
		},
		0x92: {
			name: "ChapterTimeEnd",
			level: 4,
			type: "u",
			webm: true,
			description: "Timestamp of the end of Chapter timestamp excluded, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). The value **MUST** be greater than or equal to the `ChapterTimeStart` of the same `ChapterAtom`."
		},
		0x96: {
			name: "CueRefTime",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 2,
			description: "Timestamp of the referenced Block, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks)."
		},
		0x97: {
			name: "CueRefCluster",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 0,
			maxver: 0,
			description: "The Segment Position of the Cluster containing the referenced Block."
		},
		0x98: {
			name: "ChapterFlagHidden",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			range: "0-1",
			description: "Set to 1 if a chapter is hidden. Hidden chapters **SHOULD NOT** be available to the user interface (but still to Control Tracks; see (#chapterflaghidden) on Chapter flags)."
		},
		0x9a: {
			name: "FlagInterlaced",
			cppname: "VideoFlagInterlaced",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 2,
			webm: true,
			"default": "0",
			description: "Specify whether the video frames in this track are interlaced or not."
		},
		0x9b: {
			name: "BlockDuration",
			level: 3,
			type: "u",
			description: "The duration of the Block, expressed in Track Ticks; see (#timestamp-ticks). The BlockDuration Element can be useful at the end of a Track to define the duration of the last frame (as there is no subsequent Block available), or when there is a break in a track like for subtitle tracks."
		},
		0x9c: {
			name: "FlagLacing",
			cppname: "TrackFlagLacing",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "1",
			range: "0-1",
			description: "Set to 1 if the track **MAY** contain blocks using lacing. When set to 0 all blocks **MUST** have their lacing flags set to No lacing; see (#block-lacing) on Block Lacing."
		},
		0x9d: {
			name: "FieldOrder",
			cppname: "VideoFieldOrder",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 4,
			"default": "2",
			description: "Specify the field ordering of video frames in this track."
		},
		0x9f: {
			name: "Channels",
			cppname: "AudioChannels",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "1",
			range: "not 0",
			description: "Numbers of channels in the track."
		},
		0xa0: {
			name: "BlockGroup",
			level: 2,
			type: "m",
			multiple: true,
			description: "Basic container of information containing a single Block and information specific to that Block."
		},
		0xa1: {
			name: "Block",
			level: 3,
			type: "b",
			mandatory: true,
			description: "Block containing the actual data to be rendered and a timestamp relative to the Cluster Timestamp; see (#block-structure) on Block Structure."
		},
		0xa2: {
			name: "BlockVirtual",
			level: 3,
			type: "b",
			minver: 0,
			maxver: 0,
			description: "A Block with no data. It **MUST** be stored in the stream at the place the real Block would be in display order. "
		},
		0xa3: {
			name: "SimpleBlock",
			level: 2,
			type: "b",
			multiple: true,
			minver: 2,
			webm: true,
			divx: true,
			description: "Similar to Block, see (#block-structure), but without all the extra information, mostly used to reduced overhead when no extra feature is needed; see (#simpleblock-structure) on SimpleBlock Structure."
		},
		0xa4: {
			name: "CodecState",
			level: 3,
			type: "b",
			minver: 2,
			description: "The new codec state to use. Data interpretation is private to the codec. This information **SHOULD** always be referenced by a seek entry."
		},
		0xa5: {
			name: "BlockAdditional",
			level: 5,
			type: "b",
			mandatory: true,
			webm: true,
			description: "Interpreted by the codec as it wishes (using the BlockAddID)."
		},
		0xa6: {
			name: "BlockMore",
			level: 4,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "Contain the BlockAdditional and some parameters."
		},
		0xa7: {
			name: "Position",
			cppname: "ClusterPosition",
			level: 2,
			type: "u",
			description: "The Segment Position of the Cluster in the Segment (0 in live streams). It might help to resynchronise offset on damaged streams."
		},
		0xaa: {
			name: "CodecDecodeAll",
			level: 3,
			type: "u",
			mandatory: true,
			maxver: 0,
			"default": "1",
			range: "0-1",
			description: "Set to 1 if the codec can decode potentially damaged data."
		},
		0xab: {
			name: "PrevSize",
			cppname: "ClusterPrevSize",
			level: 2,
			type: "u",
			description: "Size of the previous Cluster, in octets. Can be useful for backward playing."
		},
		0xae: {
			name: "TrackEntry",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			description: "Describes a track with all Elements."
		},
		0xaf: {
			name: "EncryptedBlock",
			level: 2,
			type: "b",
			multiple: true,
			minver: 0,
			maxver: 0,
			description: "Similar to SimpleBlock, see (#simpleblock-structure), but the data inside the Block are Transformed (encrypt and/or signed)."
		},
		0xb0: {
			name: "PixelWidth",
			cppname: "VideoPixelWidth",
			level: 4,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "Width of the encoded video frames in pixels."
		},
		0xb2: {
			name: "CueDuration",
			level: 4,
			type: "u",
			minver: 4,
			webm: true,
			description: "The duration of the block, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks). If missing, the track's DefaultDuration does not apply and no duration information is available in terms of the cues."
		},
		0xb3: {
			name: "CueTime",
			level: 3,
			type: "u",
			mandatory: true,
			description: "Absolute timestamp of the seek point, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks)."
		},
		0xb5: {
			name: "SamplingFrequency",
			cppname: "AudioSamplingFreq",
			level: 4,
			type: "f",
			mandatory: true,
			"default": "0x1.f4p+12",
			range: "> 0x0p+0",
			description: "Sampling frequency in Hz."
		},
		0xb6: {
			name: "ChapterAtom",
			level: 3,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "Contains the atom information to use as the chapter atom (apply to all tracks)."
		},
		0xb7: {
			name: "CueTrackPositions",
			level: 3,
			type: "m",
			mandatory: true,
			multiple: true,
			description: "Contain positions for different tracks corresponding to the timestamp."
		},
		0xb9: {
			name: "FlagEnabled",
			cppname: "TrackFlagEnabled",
			level: 3,
			type: "u",
			mandatory: true,
			minver: 2,
			webm: true,
			"default": "1",
			range: "0-1",
			description: "Set to 1 if the track is usable. It is possible to turn a not usable track into a usable track using chapter codecs or control tracks."
		},
		0xba: {
			name: "PixelHeight",
			cppname: "VideoPixelHeight",
			level: 4,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "Height of the encoded video frames in pixels."
		},
		0xbb: {
			name: "CuePoint",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			description: "Contains all information relative to a seek point in the Segment."
		},
		0xbf: {
			name: "CRC-32",
			level: -1,
			type: "b",
			minver: 1,
			webm: false,
			description: "The CRC is computed on all the data of the Master element it's in. The CRC element should be the first in it's parent master for easier reading. All level 1 elements should include a CRC-32. The CRC in use is the IEEE CRC32 Little Endian",
			crc: true
		},
		0xc0: {
			name: "TrickTrackUID",
			level: 3,
			type: "u",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The TrackUID of the Smooth FF/RW video in the paired EBML structure corresponding to this video track. See [@?DivXTrickTrack]."
		},
		0xc1: {
			name: "TrickTrackSegmentUID",
			level: 3,
			type: "b",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The SegmentUID of the Segment containing the track identified by TrickTrackUID. See [@?DivXTrickTrack]."
		},
		0xc4: {
			name: "TrickMasterTrackSegmentUID",
			level: 3,
			type: "b",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The SegmentUID of the Segment containing the track identified by MasterTrackUID. See [@?DivXTrickTrack]."
		},
		0xc6: {
			name: "TrickTrackFlag",
			level: 3,
			type: "u",
			minver: 0,
			maxver: 0,
			divx: true,
			"default": "0",
			description: "Set to 1 if this video track is a Smooth FF/RW track. If set to 1, MasterTrackUID and MasterTrackSegUID should must be present and BlockGroups for this track must contain ReferenceFrame structures. Otherwise, TrickTrackUID and TrickTrackSegUID must be present if this track has a corresponding Smooth FF/RW track. See [@?DivXTrickTrack]."
		},
		0xc7: {
			name: "TrickMasterTrackUID",
			level: 3,
			type: "u",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The TrackUID of the video track in the paired EBML structure that corresponds to this Smooth FF/RW track. See [@?DivXTrickTrack]."
		},
		0xc8: {
			name: "ReferenceFrame",
			level: 3,
			type: "m",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "Contains information about the last reference frame. See [@?DivXTrickTrack]."
		},
		0xc9: {
			name: "ReferenceOffset",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The relative offset, in bytes, from the previous BlockGroup element for this Smooth FF/RW video track to the containing BlockGroup element. See [@?DivXTrickTrack]."
		},
		0xca: {
			name: "ReferenceTimestamp",
			cppname: "ReferenceTimeCode",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The timestamp of the BlockGroup pointed to by ReferenceOffset, expressed in Track Ticks; see (#timestamp-ticks). See [@?DivXTrickTrack]."
		},
		0xcb: {
			name: "BlockAdditionID",
			cppname: "SliceBlockAddID",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "The ID of the BlockAdditional Element (0 is the main Block)."
		},
		0xcc: {
			name: "LaceNumber",
			cppname: "SliceLaceNumber",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			description: "The reverse number of the frame in the lace (0 is the last frame, 1 is the next to last, etc). Being able to interpret this Element is not **REQUIRED** for playback."
		},
		0xcd: {
			name: "FrameNumber",
			cppname: "SliceFrameNumber",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "The number of the frame to generate from this lace with this delay (allow you to generate many frames from the same Block/Frame)."
		},
		0xce: {
			name: "Delay",
			cppname: "SliceDelay",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "The delay to apply to the Element, expressed in Track Ticks; see (#timestamp-ticks)."
		},
		0xcf: {
			name: "SliceDuration",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "The duration to apply to the Element, expressed in Track Ticks; see (#timestamp-ticks)."
		},
		0xd7: {
			name: "TrackNumber",
			level: 3,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "The track number as used in the Block Header (using more than 127 tracks is not encouraged, though the design allows an unlimited number)."
		},
		0xdb: {
			name: "CueReference",
			level: 4,
			type: "m",
			multiple: true,
			minver: 2,
			description: "The Clusters containing the referenced Blocks."
		},
		0xe0: {
			name: "Video",
			cppname: "TrackVideo",
			level: 3,
			type: "m",
			description: "Video settings."
		},
		0xe1: {
			name: "Audio",
			cppname: "TrackAudio",
			level: 3,
			type: "m",
			description: "Audio settings."
		},
		0xe2: {
			name: "TrackOperation",
			level: 3,
			type: "m",
			minver: 3,
			description: "Operation that needs to be applied on tracks to create this virtual track. For more details look at (#track-operation)."
		},
		0xe3: {
			name: "TrackCombinePlanes",
			level: 4,
			type: "m",
			minver: 3,
			description: "Contains the list of all video plane tracks that need to be combined to create this 3D track"
		},
		0xe4: {
			name: "TrackPlane",
			level: 5,
			type: "m",
			mandatory: true,
			multiple: true,
			minver: 3,
			description: "Contains a video plane track that need to be combined to create this 3D track"
		},
		0xe5: {
			name: "TrackPlaneUID",
			level: 6,
			type: "u",
			mandatory: true,
			minver: 3,
			range: "not 0",
			description: "The trackUID number of the track representing the plane."
		},
		0xe6: {
			name: "TrackPlaneType",
			level: 6,
			type: "u",
			mandatory: true,
			minver: 3,
			description: "The kind of plane this track corresponds to."
		},
		0xe7: {
			name: "Timestamp",
			cppname: "ClusterTimecode",
			level: 2,
			type: "u",
			mandatory: true,
			description: "Absolute timestamp of the cluster, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks)."
		},
		0xe8: {
			name: "TimeSlice",
			level: 4,
			type: "m",
			multiple: true,
			minver: 0,
			maxver: 0,
			description: "Contains extra time information about the data contained in the Block. Being able to interpret this Element is not **REQUIRED** for playback."
		},
		0xe9: {
			name: "TrackJoinBlocks",
			level: 4,
			type: "m",
			minver: 3,
			description: "Contains the list of all tracks whose Blocks need to be combined to create this virtual track"
		},
		0xea: {
			name: "CueCodecState",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 2,
			"default": "0",
			description: "The Segment Position of the Codec State corresponding to this Cue Element. 0 means that the data is taken from the initial Track Entry."
		},
		0xeb: {
			name: "CueRefCodecState",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "The Segment Position of the Codec State corresponding to this referenced Element. 0 means that the data is taken from the initial Track Entry."
		},
		0xec: {
			name: "Void",
			level: -1,
			type: "b",
			minver: 1,
			description: "Used to void damaged data, to avoid unexpected behaviors when using damaged data. The content is discarded. Also used to reserve space in a sub-element for later use."
		},
		0xed: {
			name: "TrackJoinUID",
			level: 5,
			type: "u",
			mandatory: true,
			multiple: true,
			minver: 3,
			range: "not 0",
			description: "The trackUID number of a track whose blocks are used to create this virtual track."
		},
		0xee: {
			name: "BlockAddID",
			level: 5,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "1",
			range: "not 0",
			description: "An ID to identify the BlockAdditional level. If BlockAddIDType of the corresponding block is 0, this value is also the value of BlockAddIDType for the meaning of the content of BlockAdditional."
		},
		0xf0: {
			name: "CueRelativePosition",
			level: 4,
			type: "u",
			minver: 4,
			webm: true,
			description: "The relative position inside the Cluster of the referenced SimpleBlock or BlockGroup with 0 being the first possible position for an Element inside that Cluster."
		},
		0xf1: {
			name: "CueClusterPosition",
			level: 4,
			type: "u",
			mandatory: true,
			description: "The Segment Position of the Cluster containing the associated Block."
		},
		0xf7: {
			name: "CueTrack",
			level: 4,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "The track for which a position is given."
		},
		0xfa: {
			name: "ReferencePriority",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "This frame is referenced and has the specified cache priority. In cache only a frame of the same or higher priority can replace this frame. A value of 0 means the frame is not referenced."
		},
		0xfb: {
			name: "ReferenceBlock",
			level: 3,
			type: "i",
			multiple: true,
			description: "A timestamp value, relative to the timestamp of the Block in this BlockGroup, expressed in Track Ticks; see (#timestamp-ticks). This is used to reference other frames necessary to decode this frame. The relative value **SHOULD** correspond to a valid `Block` this `Block` depends on. Historically Matroska Writer didn't write the actual `Block(s)` this `Block` depends on, but *some* `Block` in the past.  The value \"0\" **MAY** also be used to signify this `Block` cannot be decoded on its own, but without knownledge of which `Block` is necessary. In this case, other `ReferenceBlock` **MUST NOT** be found in the same `BlockGroup`.  If the `BlockGroup` doesn't have any `ReferenceBlock` element, then the `Block` it contains can be decoded without using any other `Block` data."
		},
		0xfd: {
			name: "ReferenceVirtual",
			level: 3,
			type: "i",
			minver: 0,
			maxver: 0,
			description: "The Segment Position of the data that would otherwise be in position of the virtual block."
		},
		0x41a4: {
			name: "BlockAddIDName",
			level: 4,
			type: "s",
			minver: 4,
			description: "A human-friendly name describing the type of BlockAdditional data, as defined by the associated Block Additional Mapping."
		},
		0x41e4: {
			name: "BlockAdditionMapping",
			level: 3,
			type: "m",
			multiple: true,
			minver: 4,
			description: "Contains elements that extend the track format, by adding content either to each frame, with BlockAddID ((#blockaddid-element)), or to the track as a whole with BlockAddIDExtraData."
		},
		0x41e7: {
			name: "BlockAddIDType",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 4,
			"default": "0",
			description: "Stores the registered identifier of the Block Additional Mapping to define how the BlockAdditional data should be handled."
		},
		0x41ed: {
			name: "BlockAddIDExtraData",
			level: 4,
			type: "b",
			minver: 4,
			description: "Extra binary data that the BlockAddIDType can use to interpret the BlockAdditional data. The interpretation of the binary data depends on the BlockAddIDType value and the corresponding Block Additional Mapping."
		},
		0x41f0: {
			name: "BlockAddIDValue",
			level: 4,
			type: "u",
			minver: 4,
			range: ">=2",
			description: "If the track format extension needs content beside frames, the value refers to the BlockAddID ((#blockaddid-element)), value being described. To keep MaxBlockAdditionID as low as possible, small values **SHOULD** be used."
		},
		0x4254: {
			name: "ContentCompAlgo",
			level: 6,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The compression algorithm used."
		},
		0x4255: {
			name: "ContentCompSettings",
			level: 6,
			type: "b",
			description: "Settings that might be needed by the decompressor. For Header Stripping (`ContentCompAlgo`=3), the bytes that were removed from the beginning of each frames of the track."
		},
		0x4282: {
			name: "DocType",
			level: 1,
			type: "s",
			mandatory: true,
			"default": "matroska",
			minver: 1,
			description: "A string that describes the type of document that follows this EBML header. 'matroska' in our case or 'webm' for webm files."
		},
		0x4285: {
			name: "DocTypeReadVersion",
			level: 1,
			type: "u",
			mandatory: true,
			"default": 1,
			minver: 1,
			description: "The minimum DocType version an interpreter has to support to read this file."
		},
		0x4286: {
			name: "EBMLVersion",
			level: 1,
			type: "u",
			mandatory: true,
			"default": 1,
			minver: 1,
			description: "The version of EBML parser used to create the file."
		},
		0x4287: {
			name: "DocTypeVersion",
			level: 1,
			type: "u",
			mandatory: true,
			"default": 1,
			minver: 1,
			description: "The version of DocType interpreter used to create the file."
		},
		0x42f2: {
			name: "EBMLMaxIDLength",
			level: 1,
			type: "u",
			mandatory: true,
			"default": "4",
			range: "4"
		},
		0x42f3: {
			name: "EBMLMaxSizeLength",
			level: 1,
			type: "u",
			mandatory: true,
			"default": "8",
			range: "1-8"
		},
		0x42f7: {
			name: "EBMLReadVersion",
			level: 1,
			type: "u",
			mandatory: true,
			"default": 1,
			minver: 1,
			description: "The minimum EBML version a parser has to support to read this file."
		},
		0x437c: {
			name: "ChapLanguage",
			cppname: "ChapterLanguage",
			level: 5,
			type: "s",
			mandatory: true,
			multiple: true,
			webm: true,
			"default": "eng",
			description: "A language corresponding to the string, in the bibliographic ISO-639-2 form [@!ISO639-2]. This Element **MUST** be ignored if a ChapLanguageIETF Element is used within the same ChapterDisplay Element."
		},
		0x437d: {
			name: "ChapLanguageIETF",
			level: 5,
			type: "s",
			multiple: true,
			minver: 4,
			description: "Specifies a language corresponding to the ChapString in the format defined in [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If a ChapLanguageIETF Element is used, then any ChapLanguage and ChapCountry Elements used in the same ChapterDisplay **MUST** be ignored."
		},
		0x437e: {
			name: "ChapCountry",
			cppname: "ChapterCountry",
			level: 5,
			type: "s",
			multiple: true,
			webm: true,
			description: "A country corresponding to the string, using the same 2 octets country-codes as in Internet domains [@!IANADomains] based on [@!ISO3166-1] alpha-2 codes. This Element **MUST** be ignored if a ChapLanguageIETF Element is used within the same ChapterDisplay Element."
		},
		0x4444: {
			name: "SegmentFamily",
			level: 2,
			type: "b",
			multiple: true,
			description: "A randomly generated unique ID that all Segments of a Linked Segment **MUST** share (128 bits)."
		},
		0x4461: {
			name: "DateUTC",
			level: 2,
			type: "d",
			description: "The date and time that the Segment was created by the muxing application or library."
		},
		0x447a: {
			name: "TagLanguage",
			cppname: "TagLangue",
			level: 4,
			type: "s",
			mandatory: true,
			webm: true,
			"default": "und",
			description: "Specifies the language of the tag specified, in the Matroska languages form; see (#language-codes) on language codes. This Element **MUST** be ignored if the TagLanguageIETF Element is used within the same SimpleTag Element."
		},
		0x447b: {
			name: "TagLanguageIETF",
			level: 4,
			type: "s",
			minver: 4,
			description: "Specifies the language used in the TagString according to [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If this Element is used, then any TagLanguage Elements used in the same SimpleTag **MUST** be ignored."
		},
		0x4484: {
			name: "TagDefault",
			level: 4,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "1",
			range: "0-1",
			description: "A boolean value to indicate if this is the default/original language to use for the given tag."
		},
		0x4485: {
			name: "TagBinary",
			level: 4,
			type: "b",
			webm: true,
			description: "The values of the Tag, if it is binary. Note that this cannot be used in the same SimpleTag as TagString."
		},
		0x4487: {
			name: "TagString",
			level: 4,
			type: "8",
			webm: true,
			description: "The value of the Tag."
		},
		0x4489: {
			name: "Duration",
			level: 2,
			type: "f",
			range: "> 0x0p+0",
			description: "Duration of the Segment, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks)."
		},
		0x44b4: {
			name: "TagDefaultBogus",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 0,
			maxver: 0,
			"default": "1",
			range: "0-1",
			description: "A variant of the TagDefault element with a bogus Element ID; see (#tagdefault-element)."
		},
		0x450d: {
			name: "ChapProcessPrivate",
			cppname: "ChapterProcessPrivate",
			level: 5,
			type: "b",
			description: "Some optional data attached to the ChapProcessCodecID information. For ChapProcessCodecID = 1, it is the \"DVD level\" equivalent; see (#menu-features) on DVD menus."
		},
		0x4598: {
			name: "ChapterFlagEnabled",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "1",
			range: "0-1",
			description: "Set to 1 if the chapter is enabled. It can be enabled/disabled by a Control Track. When disabled, the movie **SHOULD** skip all the content between the TimeStart and TimeEnd of this chapter; see (#chapter-flags) on Chapter flags."
		},
		0x45a3: {
			name: "TagName",
			level: 4,
			type: "8",
			mandatory: true,
			webm: true,
			description: "The name of the Tag that is going to be stored."
		},
		0x45b9: {
			name: "EditionEntry",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "Contains all information about a Segment edition."
		},
		0x45bc: {
			name: "EditionUID",
			level: 3,
			type: "u",
			range: "not 0",
			description: "A unique ID to identify the edition. It's useful for tagging an edition."
		},
		0x45bd: {
			name: "EditionFlagHidden",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			range: "0-1",
			description: "Set to 1 if an edition is hidden. Hidden editions **SHOULD NOT** be available to the user interface (but still to Control Tracks; see (#chapter-flags) on Chapter flags)."
		},
		0x45db: {
			name: "EditionFlagDefault",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			range: "0-1",
			description: "Set to 1 if the edition **SHOULD** be used as the default one."
		},
		0x45dd: {
			name: "EditionFlagOrdered",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			range: "0-1",
			description: "Set to 1 if the chapters can be defined multiple times and the order to play them is enforced; see (#editionflagordered)."
		},
		0x465c: {
			name: "FileData",
			level: 3,
			type: "b",
			mandatory: true,
			description: "The data of the file."
		},
		0x4660: {
			name: "FileMimeType",
			cppname: "MimeType",
			level: 3,
			type: "s",
			mandatory: true,
			description: "MIME type of the file."
		},
		0x4661: {
			name: "FileUsedStartTime",
			level: 3,
			type: "u",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The timestamp at which this optimized font attachment comes into context, expressed in Segment Ticks which is based on TimestampScale. See [@?DivXWorldFonts]."
		},
		0x4662: {
			name: "FileUsedEndTime",
			level: 3,
			type: "u",
			minver: 0,
			maxver: 0,
			divx: true,
			description: "The timestamp at which this optimized font attachment goes out of context, expressed in Segment Ticks which is based on TimestampScale. See [@?DivXWorldFonts]."
		},
		0x466e: {
			name: "FileName",
			level: 3,
			type: "8",
			mandatory: true,
			description: "Filename of the attached file."
		},
		0x4675: {
			name: "FileReferral",
			level: 3,
			type: "b",
			minver: 0,
			maxver: 0,
			description: "A binary value that a track/codec can refer to when the attachment is needed."
		},
		0x467e: {
			name: "FileDescription",
			level: 3,
			type: "8",
			description: "A human-friendly name for the attached file."
		},
		0x46ae: {
			name: "FileUID",
			level: 3,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "Unique ID representing the file, as random as possible."
		},
		0x47e1: {
			name: "ContentEncAlgo",
			level: 6,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "0",
			description: "The encryption algorithm used. The value \"0\" means that the contents have not been encrypted."
		},
		0x47e2: {
			name: "ContentEncKeyID",
			level: 6,
			type: "b",
			webm: true,
			description: "For public key algorithms this is the ID of the public key the the data was encrypted with."
		},
		0x47e3: {
			name: "ContentSignature",
			level: 6,
			type: "b",
			maxver: 0,
			description: "A cryptographic signature of the contents."
		},
		0x47e4: {
			name: "ContentSigKeyID",
			level: 6,
			type: "b",
			maxver: 0,
			description: "This is the ID of the private key the data was signed with."
		},
		0x47e5: {
			name: "ContentSigAlgo",
			level: 6,
			type: "u",
			maxver: 0,
			"default": "0",
			description: "The algorithm used for the signature."
		},
		0x47e6: {
			name: "ContentSigHashAlgo",
			level: 6,
			type: "u",
			maxver: 0,
			"default": "0",
			description: "The hash algorithm used for the signature."
		},
		0x47e7: {
			name: "ContentEncAESSettings",
			level: 6,
			type: "m",
			minver: 4,
			webm: true,
			description: "Settings describing the encryption algorithm used. If `ContentEncAlgo` != 5 this **MUST** be ignored."
		},
		0x47e8: {
			name: "AESSettingsCipherMode",
			level: 7,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			description: "The AES cipher mode used in the encryption."
		},
		0x4d80: {
			name: "MuxingApp",
			level: 2,
			type: "8",
			mandatory: true,
			description: "Muxing application or library (example: \"libmatroska-0.4.3\")."
		},
		0x4dbb: {
			name: "Seek",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			description: "Contains a single seek entry to an EBML Element."
		},
		0x5031: {
			name: "ContentEncodingOrder",
			level: 5,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "0",
			description: "Tells when this modification was used during encoding/muxing starting with 0 and counting upwards. The decoder/demuxer has to start with the highest order number it finds and work its way down. This value has to be unique over all ContentEncodingOrder Elements in the TrackEntry that contains this ContentEncodingOrder element."
		},
		0x5032: {
			name: "ContentEncodingScope",
			level: 5,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "1",
			description: "A bit field that describes which Elements have been modified in this way. Values (big-endian) can be OR'ed."
		},
		0x5033: {
			name: "ContentEncodingType",
			level: 5,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "0",
			description: "A value describing what kind of transformation is applied."
		},
		0x5034: {
			name: "ContentCompression",
			level: 5,
			type: "m",
			description: "Settings describing the compression used. This Element **MUST** be present if the value of ContentEncodingType is 0 and absent otherwise. Each block **MUST** be decompressable even if no previous block is available in order not to prevent seeking."
		},
		0x5035: {
			name: "ContentEncryption",
			level: 5,
			type: "m",
			webm: true,
			description: "Settings describing the encryption used. This Element **MUST** be present if the value of `ContentEncodingType` is 1 (encryption) and **MUST** be ignored otherwise."
		},
		0x535f: {
			name: "CueRefNumber",
			level: 5,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "1",
			range: "not 0",
			description: "Number of the referenced Block of Track X in the specified Cluster."
		},
		0x536e: {
			name: "Name",
			cppname: "TrackName",
			level: 3,
			type: "8",
			description: "A human-readable track name."
		},
		0x5378: {
			name: "CueBlockNumber",
			level: 4,
			type: "u",
			range: "not 0",
			description: "Number of the Block in the specified Cluster."
		},
		0x537f: {
			name: "TrackOffset",
			level: 3,
			type: "i",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "A value to add to the Block's Timestamp, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). This can be used to adjust the playback offset of a track."
		},
		0x53ab: {
			name: "SeekID",
			level: 3,
			type: "b",
			mandatory: true,
			description: "The binary ID corresponding to the Element name."
		},
		0x53ac: {
			name: "SeekPosition",
			level: 3,
			type: "u",
			mandatory: true,
			description: "The Segment Position of the Element."
		},
		0x53b8: {
			name: "StereoMode",
			cppname: "VideoStereoMode",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 3,
			webm: true,
			"default": "0",
			description: "Stereo-3D video mode. There are some more details in (#multi-planar-and-3d-videos)."
		},
		0x53b9: {
			name: "OldStereoMode",
			level: 4,
			type: "u",
			maxver: 0,
			description: "DEPRECATED, DO NOT USE. Bogus StereoMode value used in old versions of libmatroska."
		},
		0x53c0: {
			name: "AlphaMode",
			cppname: "VideoAlphaMode",
			level: 4,
			type: "u",
			mandatory: true,
			minver: 3,
			webm: true,
			"default": "0",
			description: "Indicate whether the BlockAdditional Element with BlockAddID of \"1\" contains Alpha data, as defined by to the Codec Mapping for the `CodecID`. Undefined values **SHOULD NOT** be used as the behavior of known implementations is different (considered either as 0 or 1)."
		},
		0x54aa: {
			name: "PixelCropBottom",
			cppname: "VideoPixelCropBottom",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The number of video pixels to remove at the bottom of the image."
		},
		0x54b0: {
			name: "DisplayWidth",
			cppname: "VideoDisplayWidth",
			level: 4,
			type: "u",
			range: "not 0",
			description: "Width of the video frames to display. Applies to the video frame after cropping (PixelCrop* Elements)."
		},
		0x54b2: {
			name: "DisplayUnit",
			cppname: "VideoDisplayUnit",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "How DisplayWidth & DisplayHeight are interpreted."
		},
		0x54b3: {
			name: "AspectRatioType",
			cppname: "VideoAspectRatio",
			level: 4,
			type: "u",
			minver: 0,
			maxver: 0,
			"default": "0",
			description: "Specify the possible modifications to the aspect ratio."
		},
		0x54ba: {
			name: "DisplayHeight",
			cppname: "VideoDisplayHeight",
			level: 4,
			type: "u",
			range: "not 0",
			description: "Height of the video frames to display. Applies to the video frame after cropping (PixelCrop* Elements)."
		},
		0x54bb: {
			name: "PixelCropTop",
			cppname: "VideoPixelCropTop",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The number of video pixels to remove at the top of the image."
		},
		0x54cc: {
			name: "PixelCropLeft",
			cppname: "VideoPixelCropLeft",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The number of video pixels to remove on the left of the image."
		},
		0x54dd: {
			name: "PixelCropRight",
			cppname: "VideoPixelCropRight",
			level: 4,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The number of video pixels to remove on the right of the image."
		},
		0x55aa: {
			name: "FlagForced",
			cppname: "TrackFlagForced",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			range: "0-1",
			description: "Applies only to subtitles. Set if that track **SHOULD** be eligible for automatic selection by the player if it matches the user's language preference, even if the user's preferences would normally not enable subtitles with the selected audio track; this can be used for tracks containing only translations of foreign-language audio or onscreen text. See (#default-track-selection) for more details."
		},
		0x55ab: {
			name: "FlagHearingImpaired",
			level: 3,
			type: "u",
			minver: 4,
			range: "0-1",
			description: "Set to 1 if that track is suitable for users with hearing impairments, set to 0 if it is unsuitable for users with hearing impairments."
		},
		0x55ac: {
			name: "FlagVisualImpaired",
			level: 3,
			type: "u",
			minver: 4,
			range: "0-1",
			description: "Set to 1 if that track is suitable for users with visual impairments, set to 0 if it is unsuitable for users with visual impairments."
		},
		0x55ad: {
			name: "FlagTextDescriptions",
			level: 3,
			type: "u",
			minver: 4,
			range: "0-1",
			description: "Set to 1 if that track contains textual descriptions of video content, set to 0 if that track does not contain textual descriptions of video content."
		},
		0x55ae: {
			name: "FlagOriginal",
			level: 3,
			type: "u",
			minver: 4,
			range: "0-1",
			description: "Set to 1 if that track is in the content's original language, set to 0 if it is a translation."
		},
		0x55af: {
			name: "FlagCommentary",
			level: 3,
			type: "u",
			minver: 4,
			range: "0-1",
			description: "Set to 1 if that track contains commentary, set to 0 if it does not contain commentary."
		},
		0x55b0: {
			name: "Colour",
			cppname: "VideoColour",
			level: 4,
			type: "m",
			minver: 4,
			webm: true,
			description: "Settings describing the colour format."
		},
		0x55b1: {
			name: "MatrixCoefficients",
			cppname: "VideoColourMatrix",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "2",
			description: "The Matrix Coefficients of the video used to derive luma and chroma values from red, green, and blue color primaries. For clarity, the value and meanings for MatrixCoefficients are adopted from Table 4 of ISO/IEC 23001-8:2016 or ITU-T H.273."
		},
		0x55b2: {
			name: "BitsPerChannel",
			cppname: "VideoBitsPerChannel",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "Number of decoded bits per channel. A value of 0 indicates that the BitsPerChannel is unspecified."
		},
		0x55b3: {
			name: "ChromaSubsamplingHorz",
			cppname: "VideoChromaSubsampHorz",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "The amount of pixels to remove in the Cr and Cb channels for every pixel not removed horizontally. Example: For video with 4:2:0 chroma subsampling, the ChromaSubsamplingHorz **SHOULD** be set to 1."
		},
		0x55b4: {
			name: "ChromaSubsamplingVert",
			cppname: "VideoChromaSubsampVert",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "The amount of pixels to remove in the Cr and Cb channels for every pixel not removed vertically. Example: For video with 4:2:0 chroma subsampling, the ChromaSubsamplingVert **SHOULD** be set to 1."
		},
		0x55b5: {
			name: "CbSubsamplingHorz",
			cppname: "VideoCbSubsampHorz",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "The amount of pixels to remove in the Cb channel for every pixel not removed horizontally. This is additive with ChromaSubsamplingHorz. Example: For video with 4:2:1 chroma subsampling, the ChromaSubsamplingHorz **SHOULD** be set to 1 and CbSubsamplingHorz **SHOULD** be set to 1."
		},
		0x55b6: {
			name: "CbSubsamplingVert",
			cppname: "VideoCbSubsampVert",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "The amount of pixels to remove in the Cb channel for every pixel not removed vertically. This is additive with ChromaSubsamplingVert."
		},
		0x55b7: {
			name: "ChromaSitingHorz",
			cppname: "VideoChromaSitHorz",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "How chroma is subsampled horizontally."
		},
		0x55b8: {
			name: "ChromaSitingVert",
			cppname: "VideoChromaSitVert",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "How chroma is subsampled vertically."
		},
		0x55b9: {
			name: "Range",
			cppname: "VideoColourRange",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "Clipping of the color ranges."
		},
		0x55ba: {
			name: "TransferCharacteristics",
			cppname: "VideoColourTransferCharacter",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "2",
			description: "The transfer characteristics of the video. For clarity, the value and meanings for TransferCharacteristics are adopted from Table 3 of ISO/IEC 23091-4 or ITU-T H.273."
		},
		0x55bb: {
			name: "Primaries",
			cppname: "VideoColourPrimaries",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "2",
			description: "The colour primaries of the video. For clarity, the value and meanings for Primaries are adopted from Table 2 of ISO/IEC 23091-4 or ITU-T H.273."
		},
		0x55bc: {
			name: "MaxCLL",
			cppname: "VideoColourMaxCLL",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "Maximum brightness of a single pixel (Maximum Content Light Level) in candelas per square meter (cd/m^2^)."
		},
		0x55bd: {
			name: "MaxFALL",
			cppname: "VideoColourMaxFALL",
			level: 5,
			type: "u",
			minver: 4,
			webm: true,
			description: "Maximum brightness of a single full frame (Maximum Frame-Average Light Level) in candelas per square meter (cd/m^2^)."
		},
		0x55d0: {
			name: "MasteringMetadata",
			cppname: "VideoColourMasterMeta",
			level: 5,
			type: "m",
			minver: 4,
			webm: true,
			description: "SMPTE 2086 mastering data."
		},
		0x55d1: {
			name: "PrimaryRChromaticityX",
			cppname: "VideoRChromaX",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Red X chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d2: {
			name: "PrimaryRChromaticityY",
			cppname: "VideoRChromaY",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Red Y chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d3: {
			name: "PrimaryGChromaticityX",
			cppname: "VideoGChromaX",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Green X chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d4: {
			name: "PrimaryGChromaticityY",
			cppname: "VideoGChromaY",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Green Y chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d5: {
			name: "PrimaryBChromaticityX",
			cppname: "VideoBChromaX",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Blue X chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d6: {
			name: "PrimaryBChromaticityY",
			cppname: "VideoBChromaY",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "Blue Y chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d7: {
			name: "WhitePointChromaticityX",
			cppname: "VideoWhitePointChromaX",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "White X chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d8: {
			name: "WhitePointChromaticityY",
			cppname: "VideoWhitePointChromaY",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: "0-1",
			description: "White Y chromaticity coordinate, as defined by CIE 1931."
		},
		0x55d9: {
			name: "LuminanceMax",
			cppname: "VideoLuminanceMax",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: ">= 0x0p+0",
			description: "Maximum luminance. Represented in candelas per square meter (cd/m^2^)."
		},
		0x55da: {
			name: "LuminanceMin",
			cppname: "VideoLuminanceMin",
			level: 6,
			type: "f",
			minver: 4,
			webm: true,
			range: ">= 0x0p+0",
			description: "Minimum luminance. Represented in candelas per square meter (cd/m^2^)."
		},
		0x55ee: {
			name: "MaxBlockAdditionID",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The maximum value of BlockAddID ((#blockaddid-element)). A value 0 means there is no BlockAdditions ((#blockadditions-element)) for this track."
		},
		0x5654: {
			name: "ChapterStringUID",
			level: 4,
			type: "8",
			minver: 3,
			webm: true,
			description: "A unique string ID to identify the Chapter. Use for WebVTT cue identifier storage [@!WebVTT]."
		},
		0x56aa: {
			name: "CodecDelay",
			level: 3,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			description: "CodecDelay is The codec-built-in delay, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). It represents the amount of codec samples that will be discarded by the decoder during playback. This timestamp value **MUST** be subtracted from each frame timestamp in order to get the timestamp that will be actually played. The value **SHOULD** be small so the muxing of tracks with the same actual timestamp are in the same Cluster."
		},
		0x56bb: {
			name: "SeekPreRoll",
			level: 3,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "After a discontinuity, SeekPreRoll is the duration of the data the decoder **MUST** decode before the decoded data is valid, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks)."
		},
		0x5741: {
			name: "WritingApp",
			level: 2,
			type: "8",
			mandatory: true,
			description: "Writing application (example: \"mkvmerge-0.3.3\")."
		},
		0x5854: {
			name: "SilentTracks",
			cppname: "ClusterSilentTracks",
			level: 2,
			type: "m",
			minver: 0,
			maxver: 0,
			description: "The list of tracks that are not used in that part of the stream. It is useful when using overlay tracks on seeking or to decide what track to use."
		},
		0x58d7: {
			name: "SilentTrackNumber",
			cppname: "ClusterSilentTrackNumber",
			level: 3,
			type: "u",
			multiple: true,
			minver: 0,
			maxver: 0,
			description: "One of the track number that are not used from now on in the stream. It could change later if not specified as silent in a further Cluster."
		},
		0x61a7: {
			name: "AttachedFile",
			cppname: "Attached",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			description: "An attached file."
		},
		0x6240: {
			name: "ContentEncoding",
			level: 4,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "Settings for one content encoding like compression or encryption."
		},
		0x6264: {
			name: "BitDepth",
			cppname: "AudioBitDepth",
			level: 4,
			type: "u",
			range: "not 0",
			description: "Bits per sample, mostly used for PCM."
		},
		0x63a2: {
			name: "CodecPrivate",
			level: 3,
			type: "b",
			description: "Private data only known to the codec."
		},
		0x63c0: {
			name: "Targets",
			cppname: "TagTargets",
			level: 3,
			type: "m",
			mandatory: true,
			webm: true,
			description: "Specifies which other elements the metadata represented by the Tag applies to. If empty or not present, then the Tag describes everything in the Segment."
		},
		0x63c3: {
			name: "ChapterPhysicalEquiv",
			level: 4,
			type: "u",
			description: "Specify the physical equivalent of this ChapterAtom like \"DVD\" (60) or \"SIDE\" (50); see (#physical-types) for a complete list of values."
		},
		0x63c4: {
			name: "TagChapterUID",
			level: 4,
			type: "u",
			multiple: true,
			"default": "0",
			description: "A unique ID to identify the Chapter(s) the tags belong to."
		},
		0x63c5: {
			name: "TagTrackUID",
			level: 4,
			type: "u",
			multiple: true,
			webm: true,
			"default": "0",
			description: "A unique ID to identify the Track(s) the tags belong to."
		},
		0x63c6: {
			name: "TagAttachmentUID",
			level: 4,
			type: "u",
			multiple: true,
			"default": "0",
			description: "A unique ID to identify the Attachment(s) the tags belong to."
		},
		0x63c9: {
			name: "TagEditionUID",
			level: 4,
			type: "u",
			multiple: true,
			"default": "0",
			description: "A unique ID to identify the EditionEntry(s) the tags belong to."
		},
		0x63ca: {
			name: "TargetType",
			cppname: "TagTargetType",
			level: 4,
			type: "s",
			webm: true,
			description: "An informational string that can be used to display the logical level of the target like \"ALBUM\", \"TRACK\", \"MOVIE\", \"CHAPTER\", etc ; see Section 6.4 of [@!MatroskaTags]."
		},
		0x6532: {
			name: "SignedElement",
			level: 3,
			type: "b",
			multiple: true,
			webm: false,
			description: "An element ID whose data will be used to compute the signature."
		},
		0x6624: {
			name: "TrackTranslate",
			level: 3,
			type: "m",
			multiple: true,
			description: "The mapping between this `TrackEntry` and a track value in the given Chapter Codec."
		},
		0x66a5: {
			name: "TrackTranslateTrackID",
			level: 4,
			type: "b",
			mandatory: true,
			description: "The binary value used to represent this `TrackEntry` in the chapter codec data. The format depends on the `ChapProcessCodecID` used; see (#chapprocesscodecid-element)."
		},
		0x66bf: {
			name: "TrackTranslateCodec",
			level: 4,
			type: "u",
			mandatory: true,
			description: "This `TrackTranslate` applies to this chapter codec of the given chapter edition(s); see (#chapprocesscodecid-element)."
		},
		0x66fc: {
			name: "TrackTranslateEditionUID",
			level: 4,
			type: "u",
			multiple: true,
			description: "Specify a chapter edition UID on which this `TrackTranslate` applies."
		},
		0x67c8: {
			name: "SimpleTag",
			cppname: "TagSimple",
			level: 3,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "Contains general information about the target."
		},
		0x68ca: {
			name: "TargetTypeValue",
			cppname: "TagTargetTypeValue",
			level: 4,
			type: "u",
			mandatory: true,
			webm: true,
			"default": "50",
			description: "A number to indicate the logical level of the target."
		},
		0x6911: {
			name: "ChapProcessCommand",
			cppname: "ChapterProcessCommand",
			level: 5,
			type: "m",
			multiple: true,
			description: "Contains all the commands associated to the Atom."
		},
		0x6922: {
			name: "ChapProcessTime",
			cppname: "ChapterProcessTime",
			level: 6,
			type: "u",
			mandatory: true,
			description: "Defines when the process command **SHOULD** be handled"
		},
		0x6924: {
			name: "ChapterTranslate",
			level: 2,
			type: "m",
			multiple: true,
			description: "The mapping between this `Segment` and a segment value in the given Chapter Codec."
		},
		0x6933: {
			name: "ChapProcessData",
			cppname: "ChapterProcessData",
			level: 6,
			type: "b",
			mandatory: true,
			description: "Contains the command information. The data **SHOULD** be interpreted depending on the ChapProcessCodecID value. For ChapProcessCodecID = 1, the data correspond to the binary DVD cell pre/post commands; see (#menu-features) on DVD menus."
		},
		0x6944: {
			name: "ChapProcess",
			cppname: "ChapterProcess",
			level: 4,
			type: "m",
			multiple: true,
			description: "Contains all the commands associated to the Atom."
		},
		0x6955: {
			name: "ChapProcessCodecID",
			cppname: "ChapterProcessCodecID",
			level: 5,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "Contains the type of the codec used for the processing. A value of 0 means native Matroska processing (to be defined), a value of 1 means the DVD command set is used; see (#menu-features) on DVD menus. More codec IDs can be added later."
		},
		0x69a5: {
			name: "ChapterTranslateID",
			level: 3,
			type: "b",
			mandatory: true,
			description: "The binary value used to represent this Segment in the chapter codec data. The format depends on the ChapProcessCodecID used; see (#chapprocesscodecid-element)."
		},
		0x69bf: {
			name: "ChapterTranslateCodec",
			level: 3,
			type: "u",
			mandatory: true,
			description: "This `ChapterTranslate` applies to this chapter codec of the given chapter edition(s); see (#chapprocesscodecid-element)."
		},
		0x69fc: {
			name: "ChapterTranslateEditionUID",
			level: 3,
			type: "u",
			multiple: true,
			description: "Specify a chapter edition UID on which this `ChapterTranslate` applies."
		},
		0x6d80: {
			name: "ContentEncodings",
			level: 3,
			type: "m",
			webm: true,
			description: "Settings for several content encoding mechanisms like compression or encryption."
		},
		0x6de7: {
			name: "MinCache",
			cppname: "TrackMinCache",
			level: 3,
			type: "u",
			mandatory: true,
			"default": "0",
			description: "The minimum number of frames a player **SHOULD** be able to cache during playback. If set to 0, the reference pseudo-cache system is not used."
		},
		0x6df8: {
			name: "MaxCache",
			cppname: "TrackMaxCache",
			level: 3,
			type: "u",
			description: "The maximum cache size necessary to store referenced frames in and the current frame. 0 means no cache is needed."
		},
		0x6e67: {
			name: "ChapterSegmentUID",
			level: 4,
			type: "b",
			range: ">0",
			description: "The SegmentUID of another Segment to play during this chapter."
		},
		0x6ebc: {
			name: "ChapterSegmentEditionUID",
			level: 4,
			type: "u",
			range: "not 0",
			description: "The EditionUID to play from the Segment linked in ChapterSegmentUID. If ChapterSegmentEditionUID is undeclared, then no Edition of the linked Segment is used; see (#medium-linking) on medium-linking Segments."
		},
		0x6fab: {
			name: "TrackOverlay",
			level: 3,
			type: "u",
			multiple: true,
			description: "Specify that this track is an overlay track for the Track specified (in the u-integer). That means when this track has a gap, see (#silenttracks-element) on SilentTracks, the overlay track **SHOULD** be used instead. The order of multiple TrackOverlay matters, the first one is the one that **SHOULD** be used. If not found it **SHOULD** be the second, etc."
		},
		0x7373: {
			name: "Tag",
			level: 2,
			type: "m",
			mandatory: true,
			multiple: true,
			webm: true,
			description: "A single metadata descriptor."
		},
		0x7384: {
			name: "SegmentFilename",
			level: 2,
			type: "8",
			description: "A filename corresponding to this Segment."
		},
		0x73a4: {
			name: "SegmentUID",
			level: 2,
			type: "b",
			range: "not 0",
			description: "A randomly generated unique ID to identify the Segment amongst many others (128 bits)."
		},
		0x73c4: {
			name: "ChapterUID",
			level: 4,
			type: "u",
			mandatory: true,
			webm: true,
			range: "not 0",
			description: "A unique ID to identify the Chapter."
		},
		0x73c5: {
			name: "TrackUID",
			level: 3,
			type: "u",
			mandatory: true,
			range: "not 0",
			description: "A unique ID to identify the Track."
		},
		0x7446: {
			name: "AttachmentLink",
			cppname: "TrackAttachmentLink",
			level: 3,
			type: "u",
			maxver: 3,
			range: "not 0",
			description: "The UID of an attachment that is used by this codec."
		},
		0x75a1: {
			name: "BlockAdditions",
			level: 3,
			type: "m",
			webm: true,
			description: "Contain additional blocks to complete the main one. An EBML parser that has no knowledge of the Block structure could still see and use/skip these data."
		},
		0x75a2: {
			name: "DiscardPadding",
			level: 3,
			type: "i",
			minver: 4,
			webm: true,
			description: "Duration of the silent data added to the Block, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks) (padding at the end of the Block for positive value, at the beginning of the Block for negative value). The duration of DiscardPadding is not calculated in the duration of the TrackEntry and **SHOULD** be discarded during playback."
		},
		0x7670: {
			name: "Projection",
			cppname: "VideoProjection",
			level: 4,
			type: "m",
			minver: 4,
			webm: true,
			description: "Describes the video projection details. Used to render spherical, VR videos or flipping videos horizontally/vertically."
		},
		0x7671: {
			name: "ProjectionType",
			cppname: "VideoProjectionType",
			level: 5,
			type: "u",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0",
			description: "Describes the projection used for this video track."
		},
		0x7672: {
			name: "ProjectionPrivate",
			cppname: "VideoProjectionPrivate",
			level: 5,
			type: "b",
			minver: 4,
			webm: true,
			description: "Private data that only applies to a specific projection.  *  If `ProjectionType` equals 0 (Rectangular), then this element must not be present. *  If `ProjectionType` equals 1 (Equirectangular), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Equirectangular Projection Box ('equi'). *  If `ProjectionType` equals 2 (Cubemap), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Cubemap Projection Box ('cbmp'). *  If `ProjectionType` equals 3 (Mesh), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Mesh Projection Box ('mshp')."
		},
		0x7673: {
			name: "ProjectionPoseYaw",
			cppname: "VideoProjectionPoseYaw",
			level: 5,
			type: "f",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0x0p+0",
			range: ">= -0xB4p+0, <= 0xB4p+0",
			description: "Specifies a yaw rotation to the projection.  Value represents a clockwise rotation, in degrees, around the up vector. This rotation must be applied before any `ProjectionPosePitch` or `ProjectionPoseRoll` rotations. The value of this element **MUST** be in the -180 to 180 degree range, both included.  Setting `ProjectionPoseYaw` to 180 or -180 degrees, with the `ProjectionPoseRoll` and `ProjectionPosePitch` set to 0 degrees flips the image horizontally."
		},
		0x7674: {
			name: "ProjectionPosePitch",
			cppname: "VideoProjectionPosePitch",
			level: 5,
			type: "f",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0x0p+0",
			range: ">= -0x5Ap+0, <= 0x5Ap+0",
			description: "Specifies a pitch rotation to the projection.  Value represents a counter-clockwise rotation, in degrees, around the right vector. This rotation must be applied after the `ProjectionPoseYaw` rotation and before the `ProjectionPoseRoll` rotation. The value of this element **MUST** be in the -90 to 90 degree range, both included."
		},
		0x7675: {
			name: "ProjectionPoseRoll",
			cppname: "VideoProjectionPoseRoll",
			level: 5,
			type: "f",
			mandatory: true,
			minver: 4,
			webm: true,
			"default": "0x0p+0",
			range: ">= -0xB4p+0, <= 0xB4p+0",
			description: "Specifies a roll rotation to the projection.  Value represents a counter-clockwise rotation, in degrees, around the forward vector. This rotation must be applied after the `ProjectionPoseYaw` and `ProjectionPosePitch` rotations. The value of this element **MUST** be in the -180 to 180 degree range, both included.  Setting `ProjectionPoseRoll` to 180 or -180 degrees, the `ProjectionPoseYaw` to 180 or -180 degrees with `ProjectionPosePitch` set to 0 degrees flips the image vertically.  Setting `ProjectionPoseRoll` to 180 or -180 degrees, with the `ProjectionPoseYaw` and `ProjectionPosePitch` set to 0 degrees flips the image horizontally and vertically."
		},
		0x78b5: {
			name: "OutputSamplingFrequency",
			cppname: "AudioOutputSamplingFreq",
			level: 4,
			type: "f",
			range: "> 0x0p+0",
			description: "Real output sampling frequency in Hz (used for SBR techniques)."
		},
		0x7ba9: {
			name: "Title",
			level: 2,
			type: "8",
			webm: true,
			description: "General name of the Segment."
		},
		0x7d7b: {
			name: "ChannelPositions",
			cppname: "AudioPosition",
			level: 4,
			type: "b",
			minver: 0,
			maxver: 0,
			description: "Table of horizontal angles for each successive channel."
		},
		0x7e5b: {
			name: "SignatureElements",
			level: 1,
			type: "m",
			webm: false,
			description: "Contains elements that will be used to compute the signature."
		},
		0x7e7b: {
			name: "SignatureElementList",
			level: 2,
			type: "m",
			multiple: true,
			webm: false,
			i: "Cluster|Block|BlockAdditional",
			description: "A list consists of a number of consecutive elements that represent one case where data is used in signature. Ex:  means that the BlockAdditional of all Blocks in all Clusters is used for encryption."
		},
		0x7e8a: {
			name: "SignatureAlgo",
			level: 1,
			type: "u",
			webm: false,
			description: "Signature algorithm used (1=RSA, 2=elliptic)."
		},
		0x7e9a: {
			name: "SignatureHash",
			level: 1,
			type: "u",
			webm: false,
			description: "Hash algorithm used (1=SHA1-160, 2=MD5)."
		},
		0x7ea5: {
			name: "SignaturePublicKey",
			level: 1,
			type: "b",
			webm: false,
			description: "The public key to use with the algorithm (in the case of a PKI-based signature)."
		},
		0x7eb5: {
			name: "Signature",
			level: 1,
			type: "b",
			webm: false,
			description: "The signature of the data (until a new."
		},
		0x22b59c: {
			name: "Language",
			cppname: "TrackLanguage",
			level: 3,
			type: "s",
			mandatory: true,
			"default": "eng",
			description: "Specifies the language of the track in the Matroska languages form; see (#language-codes) on language codes. This Element **MUST** be ignored if the LanguageIETF Element is used in the same TrackEntry."
		},
		0x22b59d: {
			name: "LanguageIETF",
			level: 3,
			type: "s",
			minver: 4,
			description: "Specifies the language of the track according to [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If this Element is used, then any Language Elements used in the same TrackEntry **MUST** be ignored."
		},
		0x23314f: {
			name: "TrackTimestampScale",
			cppname: "TrackTimecodeScale",
			level: 3,
			type: "f",
			mandatory: true,
			maxver: 3,
			"default": "0x1p+0",
			range: "> 0x0p+0",
			description: "DEPRECATED, DO NOT USE. The scale to apply on this track to work at normal speed in relation with other tracks (mostly used to adjust video speed when the audio length differs)."
		},
		0x234e7a: {
			name: "DefaultDecodedFieldDuration",
			cppname: "TrackDefaultDecodedFieldDuration",
			level: 3,
			type: "u",
			minver: 4,
			range: "not 0",
			description: "The period between two successive fields at the output of the decoding process, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). see (#defaultdecodedfieldduration) for more information"
		},
		0x2383e3: {
			name: "FrameRate",
			cppname: "VideoFrameRate",
			level: 4,
			type: "f",
			minver: 0,
			maxver: 0,
			range: "> 0x0p+0",
			description: "Number of frames per second. This value is Informational only. It is intended for constant frame rate streams, and **SHOULD NOT** be used for a variable frame rate TrackEntry."
		},
		0x23e383: {
			name: "DefaultDuration",
			cppname: "TrackDefaultDuration",
			level: 3,
			type: "u",
			range: "not 0",
			description: "Number of nanoseconds per frame, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks) (frame in the Matroska sense -- one Element put into a (Simple)Block)."
		},
		0x258688: {
			name: "CodecName",
			level: 3,
			type: "8",
			description: "A human-readable string specifying the codec."
		},
		0x26b240: {
			name: "CodecDownloadURL",
			level: 3,
			type: "s",
			multiple: true,
			minver: 0,
			maxver: 0,
			description: "A URL to download about the codec used."
		},
		0x2ad7b1: {
			name: "TimestampScale",
			cppname: "TimecodeScale",
			level: 2,
			type: "u",
			mandatory: true,
			"default": "1000000",
			range: "not 0",
			description: "Base unit for Segment Ticks and Track Ticks, in nanoseconds. A TimestampScale value of 1.000.000 means scaled timestamps in the Segment are expressed in milliseconds; see (#timestamps) on how to interpret timestamps."
		},
		0x2ad7b2: {
			name: "TimecodeScaleDenominator",
			level: 2,
			type: "u",
			mandatory: true,
			minver: 4,
			"default": "1000000000",
			description: "Timestamp scale numerator, see TimecodeScale."
		},
		0x2eb524: {
			name: "UncompressedFourCC",
			cppname: "VideoColourSpace",
			level: 4,
			type: "b",
			description: "Specify the uncompressed pixel format used for the Track's data as a FourCC. This value is similar in scope to the biCompression value of AVI's `BITMAPINFO` [@?AVIFormat]. See the YUV video formats [@?FourCC-YUV] and RGB video formats [@?FourCC-RGB] for common values."
		},
		0x2fb523: {
			name: "GammaValue",
			cppname: "VideoGamma",
			level: 4,
			type: "f",
			minver: 0,
			maxver: 0,
			range: "> 0x0p+0",
			description: "Gamma Value."
		},
		0x3a9697: {
			name: "CodecSettings",
			level: 3,
			type: "8",
			minver: 0,
			maxver: 0,
			description: "A string describing the encoding setting used."
		},
		0x3b4040: {
			name: "CodecInfoURL",
			level: 3,
			type: "s",
			multiple: true,
			minver: 0,
			maxver: 0,
			description: "A URL to find information about the codec used."
		},
		0x3c83ab: {
			name: "PrevFilename",
			level: 2,
			type: "8",
			description: "A filename corresponding to the file of the previous Linked Segment."
		},
		0x3cb923: {
			name: "PrevUID",
			level: 2,
			type: "b",
			description: "A unique ID to identify the previous Segment of a Linked Segment (128 bits)."
		},
		0x3e83bb: {
			name: "NextFilename",
			level: 2,
			type: "8",
			description: "A filename corresponding to the file of the next Linked Segment."
		},
		0x3eb923: {
			name: "NextUID",
			level: 2,
			type: "b",
			description: "A unique ID to identify the next Segment of a Linked Segment (128 bits)."
		},
		0x1043a770: {
			name: "Chapters",
			level: 1,
			type: "m",
			webm: true,
			description: "A system to define basic menus and partition data. For more detailed information, look at the Chapters explanation in (#chapters)."
		},
		0x114d9b74: {
			name: "SeekHead",
			level: 1,
			type: "m",
			multiple: true,
			description: "Contains the Segment Position of other Top-Level Elements."
		},
		0x1254c367: {
			name: "Tags",
			level: 1,
			type: "m",
			multiple: true,
			webm: true,
			description: "Element containing metadata describing Tracks, Editions, Chapters, Attachments, or the Segment as a whole. A list of valid tags can be found in [@!MatroskaTags]."
		},
		0x1549a966: {
			name: "Info",
			level: 1,
			type: "m",
			mandatory: true,
			description: "Contains general information about the Segment."
		},
		0x1654ae6b: {
			name: "Tracks",
			level: 1,
			type: "m",
			description: "A Top-Level Element of information with many tracks described."
		},
		0x18538067: {
			name: "Segment",
			level: 0,
			type: "m",
			mandatory: true,
			description: "The Root Element that contains all other Top-Level Elements (Elements defined only at Level 1). A Matroska file is composed of 1 Segment."
		},
		0x1941a469: {
			name: "Attachments",
			level: 1,
			type: "m",
			description: "Contain attached files."
		},
		0x1a45dfa3: {
			name: "EBML",
			level: "0",
			type: "m",
			mandatory: true,
			multiple: true,
			minver: 1,
			description: "Set the EBML characteristics of the data to follow. Each EBML document has to start with this."
		},
		0x1b538667: {
			name: "SignatureSlot",
			level: -1,
			type: "m",
			multiple: true,
			webm: false,
			description: "Contain signature of some (coming) elements in the stream."
		},
		0x1c53bb6b: {
			name: "Cues",
			level: 1,
			type: "m",
			description: "A Top-Level Element to speed seeking access. All entries are local to the Segment."
		},
		0x1f43b675: {
			name: "Cluster",
			level: 1,
			type: "m",
			multiple: true,
			description: "The Top-Level Element containing the (monolithic) Block structure."
		}
	};

	var byName$1 = {};

	var schema$2 = {
		byEbmlID: byEbmlID$2,
		byName: byName$1
	};

	for ( var ebmlID in byEbmlID$2) {
		var desc = byEbmlID$2[ebmlID];
		byName$1[desc.name.replace('-', '_')] = parseInt(ebmlID, 10);
	}

	var schema_1 = schema$2;

	var hasRequiredEBMLEncoder;

	function requireEBMLEncoder () {
		if (hasRequiredEBMLEncoder) return EBMLEncoder;
		hasRequiredEBMLEncoder = 1;
		Object.defineProperty(EBMLEncoder, "__esModule", { value: true });
		var tools = requireTools();
		var tools_1 = requireTools();
		var schema = schema_1;
		var byEbmlID = schema.byEbmlID;
		var EBMLEncoder$1 = (function () {
		    function EBMLEncoder() {
		        this._schema = byEbmlID;
		        this._buffers = [];
		        this._stack = [];
		    }
		    EBMLEncoder.prototype.encode = function (elms) {
		        var _this = this;
		        return tools.concat(elms.reduce(function (lst, elm) {
		            return lst.concat(_this.encodeChunk(elm));
		        }, [])).buffer;
		    };
		    EBMLEncoder.prototype.encodeChunk = function (elm) {
		        if (elm.type === "m") {
		            if (!elm.isEnd) {
		                this.startTag(elm);
		            }
		            else {
		                this.endTag(elm);
		            }
		        }
		        else {
		            this.writeTag(elm);
		        }
		        return this.flush();
		    };
		    EBMLEncoder.prototype.flush = function () {
		        var ret = this._buffers;
		        this._buffers = [];
		        return ret;
		    };
		    EBMLEncoder.prototype.getSchemaInfo = function (tagName) {
		        var tagNums = Object.keys(this._schema).map(Number);
		        for (var i = 0; i < tagNums.length; i++) {
		            var tagNum = tagNums[i];
		            if (this._schema[tagNum].name === tagName) {
		                return new tools_1.Buffer(tagNum.toString(16), 'hex');
		            }
		        }
		        return null;
		    };
		    EBMLEncoder.prototype.writeTag = function (elm) {
		        var tagName = elm.name;
		        var tagId = this.getSchemaInfo(tagName);
		        var tagData = elm.data;
		        if (tagId == null) {
		            throw new Error('No schema entry found for ' + tagName);
		        }
		        var data = tools.encodeTag(tagId, tagData);
		        /**
		         * 親要素が閉じタグあり(isEnd)なら閉じタグが来るまで待つ(children queに入る)
		         */
		        if (this._stack.length > 0) {
		            var last = this._stack[this._stack.length - 1];
		            last.children.push({
		                tagId: tagId,
		                elm: elm,
		                children: [],
		                data: data
		            });
		            return;
		        }
		        this._buffers = this._buffers.concat(data);
		        return;
		    };
		    EBMLEncoder.prototype.startTag = function (elm) {
		        var tagName = elm.name;
		        var tagId = this.getSchemaInfo(tagName);
		        if (tagId == null) {
		            throw new Error('No schema entry found for ' + tagName);
		        }
		        /**
		         * 閉じタグ不定長の場合はスタックに積まずに即時バッファに書き込む
		         */
		        if (elm.unknownSize) {
		            var data = tools.encodeTag(tagId, new tools_1.Buffer(0), elm.unknownSize);
		            this._buffers = this._buffers.concat(data);
		            return;
		        }
		        var tag = {
		            tagId: tagId,
		            elm: elm,
		            children: [],
		            data: null
		        };
		        if (this._stack.length > 0) {
		            this._stack[this._stack.length - 1].children.push(tag);
		        }
		        this._stack.push(tag);
		    };
		    EBMLEncoder.prototype.endTag = function (elm) {
		        elm.name;
		        var tag = this._stack.pop();
		        if (tag == null) {
		            throw new Error("EBML structure is broken");
		        }
		        if (tag.elm.name !== elm.name) {
		            throw new Error("EBML structure is broken");
		        }
		        var childTagDataBuffers = tag.children.reduce(function (lst, child) {
		            if (child.data === null) {
		                throw new Error("EBML structure is broken");
		            }
		            return lst.concat(child.data);
		        }, []);
		        var childTagDataBuffer = tools.concat(childTagDataBuffers);
		        if (tag.elm.type === "m") {
		            tag.data = tools.encodeTag(tag.tagId, childTagDataBuffer, tag.elm.unknownSize);
		        }
		        else {
		            tag.data = tools.encodeTag(tag.tagId, childTagDataBuffer);
		        }
		        if (this._stack.length < 1) {
		            this._buffers = this._buffers.concat(tag.data);
		        }
		    };
		    return EBMLEncoder;
		}());
		EBMLEncoder.default = EBMLEncoder$1;
		return EBMLEncoder;
	}

	var require$$2 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_buffer);

	var tools$3 = {
	    readVint: function(buffer, start) {
	        start = start || 0;
	        for (var length = 1; length <= 8; length++) {
	            if (buffer[start] >= Math.pow(2, 8 - length)) {
	                break;
	            }
	        }
	        if (length > 8) {
	            throw new Error("Unrepresentable length: " + length + " " +
	                buffer.toString('hex', start, start + length));
	        }
	        if (start + length > buffer.length) {
	            return null;
	        }
	        var value = buffer[start] & (1 << (8 - length)) - 1;
	        for (var i = 1; i < length; i++) {
	            if (i === 7) {
	                if (value >= Math.pow(2, 53 - 8) && buffer[start + 7] > 0) {
	                    return {
	                        length: length,
	                        value: -1
	                    };
	                }
	            }
	            value *= Math.pow(2, 8);
	            value += buffer[start + i];
	        }
	        return {
	            length: length,
	            value: value
	        };
	    },

	    writeVint: function(value) {
	        if (value < 0 || value > Math.pow(2, 53)) {
	            throw new Error("Unrepresentable value: " + value);
	        }
	        for (var length = 1; length <= 8; length++) {
	            if (value < Math.pow(2, 7 * length) - 1) {
	                break;
	            }
	        }
	        var buffer = new Buffer(length);
	        for (var i = 1; i <= length; i++) {
	            var b = value & 0xFF;
	            buffer[length - i] = b;
	            value -= b;
	            value /= Math.pow(2, 8);
	        }
	        buffer[0] = buffer[0] | (1 << (8 - length));
	        return buffer;
	    }
	};

	var tools_1$2 = tools$3;

	// https://github.com/themasch/node-ebml/blob/master/lib/ebml/tools.js
	var vint$1 = function (buffer, start, signed) {
	  start = start || 0;
	  for (var length = 1; length <= 8; length++) {
	    if (buffer[start] >= Math.pow(2, 8 - length)) {
	      break
	    }
	  }
	  if (length > 8) {
	    throw new Error('Unrepresentable length: ' + length + ' ' +
	      buffer.toString('hex', start, start + length))
	  }
	  if (start + length > buffer.length) {
	    return null
	  }
	  var i;
	  var value = buffer[start] & (1 << (8 - length)) - 1;
	  for (i = 1; i < length; i++) {
	    if (i === 7) {
	      if (value >= Math.pow(2, 53 - 8) && buffer[start + 7] > 0) {
	        return {
	          length: length,
	          value: -1
	        }
	      }
	    }
	    value *= Math.pow(2, 8);
	    value += buffer[start + i];
	  }
	  if (signed) {
	    value -= Math.pow(2, length * 7 - 1) - 1;
	  }
	  return {
	    length: length,
	    value: value
	  }
	};

	var vint = vint$1;

	function BufferReader$1 (buffer) {
	  this.buffer = buffer;
	  this.offset = 0;
	}

	// a super limited subset of the node buffer API
	BufferReader$1.prototype.nextInt16BE = function () {
	  var value = this.buffer.readInt16BE(this.offset);
	  this.offset += 2;
	  return value
	};

	BufferReader$1.prototype.nextUInt8 = function () {
	  var value = this.buffer.readUInt8(this.offset);
	  this.offset += 1;
	  return value
	};

	// EBML variable sized integers
	BufferReader$1.prototype.nextUIntV = function () {
	  var v = vint(this.buffer, this.offset);
	  this.offset += v.length;
	  return v.value
	};

	BufferReader$1.prototype.nextIntV = function () {
	  var v = vint(this.buffer, this.offset, true);
	  this.offset += v.length;
	  return v.value
	};

	// buffer slice
	BufferReader$1.prototype.nextBuffer = function (length) {
	  var buffer = length
	    ? this.buffer.slice(this.offset, this.offset + length)
	    : this.buffer.slice(this.offset);
	  this.offset += length || this.length;
	  return buffer
	};

	// remaining bytes to read
	Object.defineProperty(BufferReader$1.prototype, 'length', {
	  get: function () { return this.buffer.length - this.offset }
	});

	var bufferReader = BufferReader$1;

	var BufferReader = bufferReader;

	var XIPH_LACING = 1;
	var EBML_LACING = 3;
	var FIXED_SIZE_LACING = 2;

	var ebmlBlock = function (buffer) {
	  var block = {};
	  var reader = new BufferReader(buffer);

	  block.trackNumber = reader.nextUIntV();
	  block.timecode = reader.nextInt16BE();

	  var flags = reader.nextUInt8();

	  block.invisible = !!(flags & 0x8);

	  // only valid for SimpleBlock
	  block.keyframe = !!(flags & 0x80);
	  block.discardable = !!(flags & 0x1);

	  var lacing = (flags & 0x6) >> 1;

	  block.frames = readLacedData(reader, lacing);

	  return block
	};

	function readLacedData (reader, lacing) {
	  if (!lacing) return [reader.nextBuffer()]

	  var i, frameSize;
	  var frames = [];
	  var framesNum = reader.nextUInt8() + 1; // number of frames

	  if (lacing === FIXED_SIZE_LACING) {
	    // remaining data should be divisible by the number of frames
	    if (reader.length % framesNum !== 0) throw new Error('Fixed-Size Lacing Error')

	    frameSize = reader.length / framesNum;
	    for (i = 0; i < framesNum; i++) {
	      frames.push(reader.nextBuffer(frameSize));
	    }
	    return frames
	  }

	  var frameSizes = [];

	  if (lacing === XIPH_LACING) {
	    for (i = 0; i < framesNum - 1; i++) {
	      var val;
	      frameSize = 0;
	      do {
	        val = reader.nextUInt8();
	        frameSize += val;
	      } while (val === 0xff)
	      frameSizes.push(frameSize);
	    }
	  } else if (lacing === EBML_LACING) {
	    // first frame
	    frameSize = reader.nextUIntV();
	    frameSizes.push(frameSize);

	    // middle frames
	    for (i = 1; i < framesNum - 1; i++) {
	      frameSize += reader.nextIntV();
	      frameSizes.push(frameSize);
	    }
	  }

	  for (i = 0; i < framesNum - 1; i++) {
	    frames.push(reader.nextBuffer(frameSizes[i]));
	  }

	  // last frame (remaining buffer)
	  frames.push(reader.nextBuffer());

	  return frames
	}

	var hasRequiredTools;

	function requireTools () {
		if (hasRequiredTools) return tools$4;
		hasRequiredTools = 1;
		(function (exports) {
			Object.defineProperty(exports, "__esModule", { value: true });
			/// <reference types="node"/>
			var int64_buffer_1 = int64Buffer;
			var EBMLEncoder_1 = requireEBMLEncoder();
			var _Buffer = require$$2;
			var _tools = tools_1$2;
			var _block = ebmlBlock;
			exports.Buffer = _Buffer.Buffer;
			exports.readVint = _tools.readVint;
			exports.writeVint = _tools.writeVint;
			exports.ebmlBlock = _block;
			function readBlock(buf) {
			    return exports.ebmlBlock(new exports.Buffer(buf));
			}
			exports.readBlock = readBlock;
			/**
			  * @param end - if end === false then length is unknown
			  */
			function encodeTag(tagId, tagData, unknownSize) {
			    if (unknownSize === void 0) { unknownSize = false; }
			    return concat([
			        tagId,
			        unknownSize ?
			            new exports.Buffer('01ffffffffffffff', 'hex') :
			            exports.writeVint(tagData.length),
			        tagData
			    ]);
			}
			exports.encodeTag = encodeTag;
			/**
			 * @return - SimpleBlock to WebP Filter
			 */
			function WebPFrameFilter(elms) {
			    return WebPBlockFilter(elms).reduce(function (lst, elm) {
			        var o = exports.ebmlBlock(elm.data);
			        return o.frames.reduce(function (lst, frame) {
			            // https://developers.Blob.com/speed/webp/docs/riff_container
			            var webpBuf = VP8BitStreamToRiffWebPBuffer(frame);
			            var webp = new Blob([webpBuf], { type: "image/webp" });
			            return lst.concat(webp);
			        }, lst);
			    }, []);
			}
			exports.WebPFrameFilter = WebPFrameFilter;
			/**
			 * WebP ファイルにできる SimpleBlock の パスフィルタ
			 */
			function WebPBlockFilter(elms) {
			    return elms.reduce(function (lst, elm) {
			        if (elm.type !== "b") {
			            return lst;
			        }
			        if (elm.name !== "SimpleBlock") {
			            return lst;
			        }
			        var o = exports.ebmlBlock(elm.data);
			        var hasWebP = o.frames.some(function (frame) {
			            // https://tools.ietf.org/html/rfc6386#section-19.1
			            var startcode = frame.slice(3, 6).toString("hex");
			            return startcode === "9d012a";
			        });
			        if (!hasWebP) {
			            return lst;
			        }
			        return lst.concat(elm);
			    }, []);
			}
			exports.WebPBlockFilter = WebPBlockFilter;
			/**
			 * @param frame - VP8 BitStream のうち startcode をもつ frame
			 * @return - WebP ファイルの ArrayBuffer
			 */
			function VP8BitStreamToRiffWebPBuffer(frame) {
			    var VP8Chunk = createRIFFChunk("VP8 ", frame);
			    var WebPChunk = concat([
			        new exports.Buffer("WEBP", "ascii"),
			        VP8Chunk
			    ]);
			    return createRIFFChunk("RIFF", WebPChunk);
			}
			exports.VP8BitStreamToRiffWebPBuffer = VP8BitStreamToRiffWebPBuffer;
			/**
			 * RIFF データチャンクを作る
			 */
			function createRIFFChunk(FourCC, chunk) {
			    var chunkSize = new exports.Buffer(4);
			    chunkSize.writeUInt32LE(chunk.byteLength, 0);
			    return concat([
			        new exports.Buffer(FourCC.substr(0, 4), "ascii"),
			        chunkSize,
			        chunk,
			        new exports.Buffer(chunk.byteLength % 2 === 0 ? 0 : 1) // padding
			    ]);
			}
			exports.createRIFFChunk = createRIFFChunk;
			/* Original Metadata

			 m  0	EBML
			 u  1	  EBMLVersion 1
			 u  1	  EBMLReadVersion 1
			 u  1	  EBMLMaxIDLength 4
			 u  1	  EBMLMaxSizeLength 8
			 s  1	  DocType webm
			 u  1	  DocTypeVersion 4
			 u  1	  DocTypeReadVersion 2
			 m  0	Segment
			 m  1	  Info                                segmentContentStartPos, all CueClusterPositions provided in info.cues will be relative to here and will need adjusted
			 u  2	    TimecodeScale 1000000
			 8  2	    MuxingApp Chrome
			 8  2	    WritingApp Chrome
			 m  1	  Tracks                              tracksStartPos
			 m  2	    TrackEntry
			 u  3	      TrackNumber 1
			 u  3	      TrackUID 31790271978391090
			 u  3	      TrackType 2
			 s  3	      CodecID A_OPUS
			 b  3	      CodecPrivate <Buffer 19>
			 m  3	      Audio
			 f  4	        SamplingFrequency 48000
			 u  4	        Channels 1
			 m  2	    TrackEntry
			 u  3	      TrackNumber 2
			 u  3	      TrackUID 24051277436254136
			 u  3	      TrackType 1
			 s  3	      CodecID V_VP8
			 m  3	      Video
			 u  4	        PixelWidth 1024
			 u  4	        PixelHeight 576
			 m  1	  Cluster                             clusterStartPos
			 u  2	    Timecode 0
			 b  2	    SimpleBlock track:2 timecode:0	keyframe:true	invisible:false	discardable:false	lacing:1
			*/
			/* Desired Metadata

			 m	0 EBML
			 u	1   EBMLVersion 1
			 u	1   EBMLReadVersion 1
			 u	1   EBMLMaxIDLength 4
			 u	1   EBMLMaxSizeLength 8
			 s	1   DocType webm
			 u	1   DocTypeVersion 4
			 u	1   DocTypeReadVersion 2
			 m	0 Segment
			 m	1   SeekHead                            -> This is SeekPosition 0, so all SeekPositions can be calculated as (bytePos - segmentContentStartPos), which is 44 in this case
			 m	2     Seek
			 b	3       SeekID                          -> Buffer([0x15, 0x49, 0xA9, 0x66])  Info
			 u	3       SeekPosition                    -> infoStartPos =
			 m	2     Seek
			 b	3       SeekID                          -> Buffer([0x16, 0x54, 0xAE, 0x6B])  Tracks
			 u	3       SeekPosition { tracksStartPos }
			 m	2     Seek
			 b	3       SeekID                          -> Buffer([0x1C, 0x53, 0xBB, 0x6B])  Cues
			 u	3       SeekPosition { cuesStartPos }
			 m	1   Info
			 f	2     Duration 32480                    -> overwrite, or insert if it doesn't exist
			 u	2     TimecodeScale 1000000
			 8	2     MuxingApp Chrome
			 8	2     WritingApp Chrome
			 m	1   Tracks
			 m	2     TrackEntry
			 u	3       TrackNumber 1
			 u	3       TrackUID 31790271978391090
			 u	3       TrackType 2
			 s	3       CodecID A_OPUS
			 b	3       CodecPrivate <Buffer 19>
			 m	3       Audio
			 f	4         SamplingFrequency 48000
			 u	4         Channels 1
			 m	2     TrackEntry
			 u	3       TrackNumber 2
			 u	3       TrackUID 24051277436254136
			 u	3       TrackType 1
			 s	3       CodecID V_VP8
			 m	3       Video
			 u	4         PixelWidth 1024
			 u	4         PixelHeight 576
			 m  1   Cues                                -> cuesStartPos
			 m  2     CuePoint
			 u  3       CueTime 0
			 m  3       CueTrackPositions
			 u  4         CueTrack 1
			 u  4         CueClusterPosition 3911
			 m  2     CuePoint
			 u  3       CueTime 600
			 m  3       CueTrackPositions
			 u  4         CueTrack 1
			 u  4         CueClusterPosition 3911
			 m  1   Cluster
			 u  2     Timecode 0
			 b  2     SimpleBlock track:2 timecode:0	keyframe:true	invisible:false	discardable:false	lacing:1
			*/
			/**
			 * convert the metadata from a streaming webm bytestream to a seekable file by inserting Duration, Seekhead and Cues
			 * @param originalMetadata - orginal metadata (everything before the clusters start) from media recorder
			 * @param duration - Duration (TimecodeScale)
			 * @param cues - cue points for clusters
			 */
			function makeMetadataSeekable(originalMetadata, duration, cuesInfo) {
			    // extract the header, we can reuse this as-is
			    var header = extractElement("EBML", originalMetadata);
			    var headerSize = encodedSizeOfEbml(header);
			    //console.error("Header size: " + headerSize);
			    //printElementIds(header);
			    // After the header comes the Segment open tag, which in this implementation is always 12 bytes (4 byte id, 8 byte 'unknown length')
			    // After that the segment content starts. All SeekPositions and CueClusterPosition must be relative to segmentContentStartPos
			    var segmentContentStartPos = headerSize + 12;
			    //console.error("segmentContentStartPos: " + segmentContentStartPos);    
			    // find the original metadata size, and adjust it for header size and Segment start element so we can keep all positions relative to segmentContentStartPos
			    var originalMetadataSize = originalMetadata[originalMetadata.length - 1].dataEnd - segmentContentStartPos;
			    //console.error("Original Metadata size: " + originalMetadataSize);
			    //printElementIds(originalMetadata);
			    // extract the segment info, remove the potentially existing Duration element, and add our own one.
			    var info = extractElement("Info", originalMetadata);
			    removeElement("Duration", info);
			    info.splice(1, 0, { name: "Duration", type: "f", data: createFloatBuffer(duration, 8) });
			    var infoSize = encodedSizeOfEbml(info);
			    //console.error("Info size: " + infoSize);
			    //printElementIds(info);  
			    // extract the track info, we can re-use this as is
			    var tracks = extractElement("Tracks", originalMetadata);
			    var tracksSize = encodedSizeOfEbml(tracks);
			    //console.error("Tracks size: " + tracksSize);
			    //printElementIds(tracks);  
			    var seekHeadSize = 47; // Initial best guess, but could be slightly larger if the Cues element is huge.
			    var seekHead = [];
			    var cuesSize = 5 + cuesInfo.length * 15; // very rough initial approximation, depends a lot on file size and number of CuePoints                   
			    var cues = [];
			    var lastSizeDifference = -1; // 
			    // The size of SeekHead and Cues elements depends on how many bytes the offsets values can be encoded in.
			    // The actual offsets in CueClusterPosition depend on the final size of the SeekHead and Cues elements
			    // We need to iteratively converge to a stable solution.
			    var maxIterations = 10;
			    var _loop_1 = function (i) {
			        // SeekHead starts at 0
			        var infoStart = seekHeadSize; // Info comes directly after SeekHead
			        var tracksStart = infoStart + infoSize; // Tracks comes directly after Info
			        var cuesStart = tracksStart + tracksSize; // Cues starts directly after 
			        var newMetadataSize = cuesStart + cuesSize; // total size of metadata  
			        // This is the offset all CueClusterPositions should be adjusted by due to the metadata size changing.
			        var sizeDifference = newMetadataSize - originalMetadataSize;
			        // console.error(`infoStart: ${infoStart}, infoSize: ${infoSize}`);
			        // console.error(`tracksStart: ${tracksStart}, tracksSize: ${tracksSize}`);
			        // console.error(`cuesStart: ${cuesStart}, cuesSize: ${cuesSize}`);
			        // console.error(`originalMetadataSize: ${originalMetadataSize}, newMetadataSize: ${newMetadataSize}, sizeDifference: ${sizeDifference}`); 
			        // create the SeekHead element
			        seekHead = [];
			        seekHead.push({ name: "SeekHead", type: "m", isEnd: false });
			        seekHead.push({ name: "Seek", type: "m", isEnd: false });
			        seekHead.push({ name: "SeekID", type: "b", data: new exports.Buffer([0x15, 0x49, 0xA9, 0x66]) }); // Info
			        seekHead.push({ name: "SeekPosition", type: "u", data: createUIntBuffer(infoStart) });
			        seekHead.push({ name: "Seek", type: "m", isEnd: true });
			        seekHead.push({ name: "Seek", type: "m", isEnd: false });
			        seekHead.push({ name: "SeekID", type: "b", data: new exports.Buffer([0x16, 0x54, 0xAE, 0x6B]) }); // Tracks
			        seekHead.push({ name: "SeekPosition", type: "u", data: createUIntBuffer(tracksStart) });
			        seekHead.push({ name: "Seek", type: "m", isEnd: true });
			        seekHead.push({ name: "Seek", type: "m", isEnd: false });
			        seekHead.push({ name: "SeekID", type: "b", data: new exports.Buffer([0x1C, 0x53, 0xBB, 0x6B]) }); // Cues
			        seekHead.push({ name: "SeekPosition", type: "u", data: createUIntBuffer(cuesStart) });
			        seekHead.push({ name: "Seek", type: "m", isEnd: true });
			        seekHead.push({ name: "SeekHead", type: "m", isEnd: true });
			        seekHeadSize = encodedSizeOfEbml(seekHead);
			        //console.error("SeekHead size: " + seekHeadSize);
			        //printElementIds(seekHead);  
			        // create the Cues element
			        cues = [];
			        cues.push({ name: "Cues", type: "m", isEnd: false });
			        cuesInfo.forEach(function (_a) {
			            var CueTrack = _a.CueTrack, CueClusterPosition = _a.CueClusterPosition, CueTime = _a.CueTime;
			            cues.push({ name: "CuePoint", type: "m", isEnd: false });
			            cues.push({ name: "CueTime", type: "u", data: createUIntBuffer(CueTime) });
			            cues.push({ name: "CueTrackPositions", type: "m", isEnd: false });
			            cues.push({ name: "CueTrack", type: "u", data: createUIntBuffer(CueTrack) });
			            //console.error(`CueClusterPosition: ${CueClusterPosition}, Corrected to: ${CueClusterPosition - segmentContentStartPos}  , offset by ${sizeDifference} to become ${(CueClusterPosition - segmentContentStartPos) + sizeDifference - segmentContentStartPos}`);
			            // EBMLReader returns CueClusterPosition with absolute byte offsets. The Cues section expects them as offsets from the first level 1 element of the Segment, so we need to adjust it.
			            CueClusterPosition -= segmentContentStartPos;
			            // We also need to adjust to take into account the change in metadata size from when EBMLReader read the original metadata.
			            CueClusterPosition += sizeDifference;
			            cues.push({ name: "CueClusterPosition", type: "u", data: createUIntBuffer(CueClusterPosition) });
			            cues.push({ name: "CueTrackPositions", type: "m", isEnd: true });
			            cues.push({ name: "CuePoint", type: "m", isEnd: true });
			        });
			        cues.push({ name: "Cues", type: "m", isEnd: true });
			        cuesSize = encodedSizeOfEbml(cues);
			        //console.error("Cues size: " + cuesSize);   
			        //console.error("Cue count: " + cuesInfo.length);
			        //printElementIds(cues);      
			        // If the new MetadataSize is not the same as the previous iteration, we need to run once more.
			        if (lastSizeDifference !== sizeDifference) {
			            lastSizeDifference = sizeDifference;
			            if (i === maxIterations - 1) {
			                throw new Error("Failed to converge to a stable metadata size");
			            }
			        }
			        else {
			            return "break";
			        }
			    };
			    for (var i = 0; i < maxIterations; i++) {
			        var state_1 = _loop_1(i);
			        if (state_1 === "break")
			            break;
			    }
			    var finalMetadata = [].concat.apply([], [
			        header,
			        { name: "Segment", type: "m", isEnd: false, unknownSize: true },
			        seekHead,
			        info,
			        tracks,
			        cues
			    ]);
			    var result = new EBMLEncoder_1.default().encode(finalMetadata);
			    //printElementIds(finalMetadata);
			    //console.error(`Final metadata buffer size: ${result.byteLength}`);
			    //console.error(`Final metadata buffer size without header and segment: ${result.byteLength-segmentContentStartPos}`);
			    return result;
			}
			exports.makeMetadataSeekable = makeMetadataSeekable;
			/**
			 * print all element id names in a list

			 * @param metadata - array of EBML elements to print
			 *
			export function printElementIds(metadata: EBML.EBMLElementBuffer[]) {

			  let result: EBML.EBMLElementBuffer[] = [];
			  let start: number = -1;

			  for (let i = 0; i < metadata.length; i++) {
			    console.error("\t id: " + metadata[i].name);
			  }
			}
			*/
			/**
			 * remove all occurances of an EBML element from an array of elements
			 * If it's a MasterElement you will also remove the content. (everything between start and end)
			 * @param idName - name of the EBML Element to remove.
			 * @param metadata - array of EBML elements to search
			 */
			function removeElement(idName, metadata) {
			    var start = -1;
			    for (var i = 0; i < metadata.length; i++) {
			        var element = metadata[i];
			        if (element.name === idName) {
			            // if it's a Master element, extract the start and end element, and everything in between
			            if (element.type === "m") {
			                if (!element.isEnd) {
			                    start = i;
			                }
			                else {
			                    // we've reached the end, extract the whole thing
			                    if (start == -1)
			                        throw new Error("Detected " + idName + " closing element before finding the start");
			                    metadata.splice(start, i - start + 1);
			                    return;
			                }
			            }
			            else {
			                // not a Master element, so we've found what we're looking for.
			                metadata.splice(i, 1);
			                return;
			            }
			        }
			    }
			}
			exports.removeElement = removeElement;
			/**
			 * extract the first occurance of an EBML tag from a flattened array of EBML data.
			 * If it's a MasterElement you will also get the content. (everything between start and end)
			 * @param idName - name of the EBML Element to extract.
			 * @param metadata - array of EBML elements to search
			 */
			function extractElement(idName, metadata) {
			    var result = [];
			    var start = -1;
			    for (var i = 0; i < metadata.length; i++) {
			        var element = metadata[i];
			        if (element.name === idName) {
			            // if it's a Master element, extract the start and end element, and everything in between
			            if (element.type === "m") {
			                if (!element.isEnd) {
			                    start = i;
			                }
			                else {
			                    // we've reached the end, extract the whole thing
			                    if (start == -1)
			                        throw new Error("Detected " + idName + " closing element before finding the start");
			                    result = metadata.slice(start, i + 1);
			                    break;
			                }
			            }
			            else {
			                // not a Master element, so we've found what we're looking for.
			                result.push(metadata[i]);
			                break;
			            }
			        }
			    }
			    return result;
			}
			exports.extractElement = extractElement;
			/**
			 * @deprecated
			 * metadata に対して duration と seekhead を追加した metadata を返す
			 * @param metadata - 変更前の webm における ファイル先頭から 最初の Cluster 要素までの 要素
			 * @param duration - Duration (TimecodeScale)
			 * @param cues - cue points for clusters
			 * @deprecated @param clusterPtrs - 変更前の webm における SeekHead に追加する Cluster 要素 への start pointer
			 * @deprecated @param cueInfos - please use cues.
			 */
			function putRefinedMetaData(metadata, info) {
			    if (Array.isArray(info.cueInfos) && !Array.isArray(info.cues)) {
			        console.warn("putRefinedMetaData: info.cueInfos property is deprecated. please use info.cues");
			        info.cues = info.cueInfos;
			    }
			    var ebml = [];
			    var payload = [];
			    for (var i_1 = 0; i_1 < metadata.length; i_1++) {
			        var elm = metadata[i_1];
			        if (elm.type === "m" && elm.name === "Segment") {
			            ebml = metadata.slice(0, i_1);
			            payload = metadata.slice(i_1);
			            if (elm.unknownSize) {
			                payload.shift(); // remove segment tag
			                break;
			            }
			            throw new Error("this metadata is not streaming webm file");
			        }
			    }
			    // *0    *4    *5  *36      *40   *48=segmentOffset              *185=originalPayloadOffsetEnd
			    // |     |     |   |        |     |                              |
			    // [EBML][size]....[Segment][size][Info][size][Duration][size]...[Cluster]
			    // |               |        |^inf |                              |
			    // |               +segmentSiz(12)+                              |
			    // +-ebmlSize(36)--+        |     +-payloadSize(137)-------------+offsetEndDiff+
			    //                 |        |     +-newPayloadSize(??)-------------------------+
			    //                 |        |     |                                            |
			    //                 [Segment][size][Info][size][Duration][size]....[size][value][Cluster]
			    //                           ^                                                 |
			    //                           |                                                 *??=newPayloadOffsetEnd
			    //                           inf
			    if (!(payload[payload.length - 1].dataEnd > 0)) {
			        throw new Error("metadata dataEnd has wrong number");
			    }
			    var originalPayloadOffsetEnd = payload[payload.length - 1].dataEnd; // = first cluster ptr
			    var ebmlSize = ebml[ebml.length - 1].dataEnd; // = first segment ptr
			    var refinedEBMLSize = new EBMLEncoder_1.default().encode(ebml).byteLength;
			    var offsetDiff = refinedEBMLSize - ebmlSize;
			    var payloadSize = originalPayloadOffsetEnd - payload[0].tagStart;
			    payload[0].tagStart - ebmlSize;
			    payload[0].tagStart;
			    var segmentTagBuf = new exports.Buffer([0x18, 0x53, 0x80, 0x67]); // Segment
			    var segmentSizeBuf = new exports.Buffer('01ffffffffffffff', 'hex'); // Segmentの最後の位置は無数の Cluster 依存なので。 writeVint(newPayloadSize).byteLength ではなく、 infinity.
			    var _segmentSize = segmentTagBuf.byteLength + segmentSizeBuf.byteLength; // == segmentSize
			    var newPayloadSize = payloadSize;
			    // We need the size to be stable between two refinements in order for our offsets to be correct
			    // Bound the number of possible refinements so we can't go infinate if something goes wrong
			    var i;
			    for (i = 1; i < 20; i++) {
			        var newPayloadOffsetEnd = ebmlSize + _segmentSize + newPayloadSize;
			        var offsetEndDiff = newPayloadOffsetEnd - originalPayloadOffsetEnd;
			        var sizeDiff = offsetDiff + offsetEndDiff;
			        var refined = refineMetadata(payload, sizeDiff, info);
			        var newNewRefinedSize = new EBMLEncoder_1.default().encode(refined).byteLength; // 一旦 seekhead を作って自身のサイズを調べる
			        if (newNewRefinedSize === newPayloadSize) {
			            // Size is stable
			            return new EBMLEncoder_1.default().encode([].concat(ebml, [{ type: "m", name: "Segment", isEnd: false, unknownSize: true }], refined));
			        }
			        newPayloadSize = newNewRefinedSize;
			    }
			    throw new Error("unable to refine metadata, stable size could not be found in " + i + " iterations!");
			}
			exports.putRefinedMetaData = putRefinedMetaData;
			// Given a list of EBMLElementBuffers, returns their encoded size in bytes
			function encodedSizeOfEbml(refinedMetaData) {
			    var encorder = new EBMLEncoder_1.default();
			    return refinedMetaData.reduce(function (lst, elm) { return lst.concat(encorder.encode([elm])); }, []).reduce(function (o, buf) { return o + buf.byteLength; }, 0);
			}
			function refineMetadata(mesetadata, sizeDiff, info) {
			    var duration = info.duration, clusterPtrs = info.clusterPtrs, cues = info.cues;
			    var _metadata = mesetadata.slice(0);
			    if (typeof duration === "number") {
			        // duration を追加する
			        var overwrited_1 = false;
			        _metadata.forEach(function (elm) {
			            if (elm.type === "f" && elm.name === "Duration") {
			                overwrited_1 = true;
			                elm.data = createFloatBuffer(duration, 8);
			            }
			        });
			        if (!overwrited_1) {
			            insertTag(_metadata, "Info", [{ name: "Duration", type: "f", data: createFloatBuffer(duration, 8) }]);
			        }
			    }
			    if (Array.isArray(cues)) {
			        insertTag(_metadata, "Cues", create_cue(cues, sizeDiff));
			    }
			    var seekhead_children = [];
			    if (Array.isArray(clusterPtrs)) {
			        console.warn("append cluster pointers to seekhead is deprecated. please use cues");
			        seekhead_children = create_seek_from_clusters(clusterPtrs, sizeDiff);
			    }
			    // remove seek info
			    /*
			    _metadata = _metadata.filter((elm)=> !(
			      elm.name === "Seek" ||
			      elm.name === "SeekID" ||
			      elm.name === "SeekPosition") );
			    */
			    // working on progress
			    //seekhead_children = seekhead_children.concat(create_seekhead(_metadata));
			    insertTag(_metadata, "SeekHead", seekhead_children, true);
			    return _metadata;
			}
			function create_seek_from_clusters(clusterPtrs, sizeDiff) {
			    var seeks = [];
			    clusterPtrs.forEach(function (start) {
			        seeks.push({ name: "Seek", type: "m", isEnd: false });
			        // [0x1F, 0x43, 0xB6, 0x75] で Cluster 意
			        seeks.push({ name: "SeekID", type: "b", data: new exports.Buffer([0x1F, 0x43, 0xB6, 0x75]) });
			        seeks.push({ name: "SeekPosition", type: "u", data: createUIntBuffer(start + sizeDiff) });
			        seeks.push({ name: "Seek", type: "m", isEnd: true });
			    });
			    return seeks;
			}
			function create_cue(cueInfos, sizeDiff) {
			    var cues = [];
			    cueInfos.forEach(function (_a) {
			        var CueTrack = _a.CueTrack, CueClusterPosition = _a.CueClusterPosition, CueTime = _a.CueTime;
			        cues.push({ name: "CuePoint", type: "m", isEnd: false });
			        cues.push({ name: "CueTime", type: "u", data: createUIntBuffer(CueTime) });
			        cues.push({ name: "CueTrackPositions", type: "m", isEnd: false });
			        cues.push({ name: "CueTrack", type: "u", data: createUIntBuffer(CueTrack) }); // video track
			        cues.push({ name: "CueClusterPosition", type: "u", data: createUIntBuffer(CueClusterPosition + sizeDiff) });
			        cues.push({ name: "CueTrackPositions", type: "m", isEnd: true });
			        cues.push({ name: "CuePoint", type: "m", isEnd: true });
			    });
			    return cues;
			}
			function insertTag(_metadata, tagName, children, insertHead) {
			    if (insertHead === void 0) { insertHead = false; }
			    // find the tagname from _metadata
			    var idx = -1;
			    for (var i = 0; i < _metadata.length; i++) {
			        var elm = _metadata[i];
			        if (elm.type === "m" && elm.name === tagName && elm.isEnd === false) {
			            idx = i;
			            break;
			        }
			    }
			    if (idx >= 0) {
			        // insert [<CuePoint />] to <Cues />
			        Array.prototype.splice.apply(_metadata, [idx + 1, 0].concat(children));
			    }
			    else if (insertHead) {
			        [].concat([{ name: tagName, type: "m", isEnd: false }], children, [{ name: tagName, type: "m", isEnd: true }]).reverse().forEach(function (elm) { _metadata.unshift(elm); });
			    }
			    else {
			        // metadata 末尾に <Cues /> を追加
			        // insert <Cues />
			        _metadata.push({ name: tagName, type: "m", isEnd: false });
			        children.forEach(function (elm) { _metadata.push(elm); });
			        _metadata.push({ name: tagName, type: "m", isEnd: true });
			    }
			}
			// alter Buffer.concat - https://github.com/feross/buffer/issues/154
			function concat(list) {
			    //return Buffer.concat.apply(Buffer, list);
			    var i = 0;
			    var length = 0;
			    for (; i < list.length; ++i) {
			        length += list[i].length;
			    }
			    var buffer = exports.Buffer.allocUnsafe(length);
			    var pos = 0;
			    for (i = 0; i < list.length; ++i) {
			        var buf = list[i];
			        buf.copy(buffer, pos);
			        pos += buf.length;
			    }
			    return buffer;
			}
			exports.concat = concat;
			function encodeValueToBuffer(elm) {
			    var data = new exports.Buffer(0);
			    if (elm.type === "m") {
			        return elm;
			    }
			    switch (elm.type) {
			        case "u":
			            data = createUIntBuffer(elm.value);
			            break;
			        case "i":
			            data = createIntBuffer(elm.value);
			            break;
			        case "f":
			            data = createFloatBuffer(elm.value);
			            break;
			        case "s":
			            data = new exports.Buffer(elm.value, 'ascii');
			            break;
			        case "8":
			            data = new exports.Buffer(elm.value, 'utf8');
			            break;
			        case "b":
			            data = elm.value;
			            break;
			        case "d":
			            data = new int64_buffer_1.Int64BE(elm.value.getTime().toString()).toBuffer();
			            break;
			    }
			    return Object.assign({}, elm, { data: data });
			}
			exports.encodeValueToBuffer = encodeValueToBuffer;
			function createUIntBuffer(value) {
			    // Big-endian, any size from 1 to 8
			    // but js number is float64, so max 6 bit octets
			    var bytes = 1;
			    for (; value >= Math.pow(2, 8 * bytes); bytes++) { }
			    if (bytes >= 7) {
			        console.warn("7bit or more bigger uint not supported.");
			        return new int64_buffer_1.Uint64BE(value).toBuffer();
			    }
			    var data = new exports.Buffer(bytes);
			    data.writeUIntBE(value, 0, bytes);
			    return data;
			}
			exports.createUIntBuffer = createUIntBuffer;
			function createIntBuffer(value) {
			    // Big-endian, any size from 1 to 8 octets
			    // but js number is float64, so max 6 bit
			    var bytes = 1;
			    for (; value >= Math.pow(2, 8 * bytes); bytes++) { }
			    if (bytes >= 7) {
			        console.warn("7bit or more bigger uint not supported.");
			        return new int64_buffer_1.Int64BE(value).toBuffer();
			    }
			    var data = new exports.Buffer(bytes);
			    data.writeIntBE(value, 0, bytes);
			    return data;
			}
			exports.createIntBuffer = createIntBuffer;
			function createFloatBuffer(value, bytes) {
			    if (bytes === void 0) { bytes = 8; }
			    // Big-endian, defined for 4 and 8 octets (32, 64 bits)
			    // js number is float64 so 8 bytes.
			    if (bytes === 8) {
			        // 64bit
			        var data = new exports.Buffer(8);
			        data.writeDoubleBE(value, 0);
			        return data;
			    }
			    else if (bytes === 4) {
			        // 32bit
			        var data = new exports.Buffer(4);
			        data.writeFloatBE(value, 0);
			        return data;
			    }
			    else {
			        throw new Error("float type bits must 4bytes or 8bytes");
			    }
			}
			exports.createFloatBuffer = createFloatBuffer;
			function convertEBMLDateToJSDate(int64str) {
			    if (int64str instanceof Date) {
			        return int64str;
			    }
			    return new Date(new Date("2001-01-01T00:00:00.000Z").getTime() + (Number(int64str) / 1000 / 1000));
			}
			exports.convertEBMLDateToJSDate = convertEBMLDateToJSDate;
	} (tools$4));
		return tools$4;
	}

	Object.defineProperty(EBMLDecoder$2, "__esModule", { value: true });
	var tools_1$1 = requireTools();
	var int64_buffer_1 = int64Buffer;
	var tools$2 = requireTools();
	var schema$1 = schema_1;
	var byEbmlID$1 = schema$1.byEbmlID;
	// https://www.matroska.org/technical/specs/index.html
	var State$1;
	(function (State) {
	    State[State["STATE_TAG"] = 1] = "STATE_TAG";
	    State[State["STATE_SIZE"] = 2] = "STATE_SIZE";
	    State[State["STATE_CONTENT"] = 3] = "STATE_CONTENT";
	})(State$1 || (State$1 = {}));
	var EBMLDecoder$1 = (function () {
	    function EBMLDecoder() {
	        this._buffer = new tools_1$1.Buffer(0);
	        this._tag_stack = [];
	        this._state = State$1.STATE_TAG;
	        this._cursor = 0;
	        this._total = 0;
	        this._schema = byEbmlID$1;
	        this._result = [];
	    }
	    EBMLDecoder.prototype.decode = function (chunk) {
	        this.readChunk(chunk);
	        var diff = this._result;
	        this._result = [];
	        return diff;
	    };
	    EBMLDecoder.prototype.readChunk = function (chunk) {
	        // 読みかけの(読めなかった) this._buffer と 新しい chunk を合わせて読み直す
	        this._buffer = tools$2.concat([this._buffer, new tools_1$1.Buffer(chunk)]);
	        while (this._cursor < this._buffer.length) {
	            // console.log(this._cursor, this._total, this._tag_stack);
	            if (this._state === State$1.STATE_TAG && !this.readTag()) {
	                break;
	            }
	            if (this._state === State$1.STATE_SIZE && !this.readSize()) {
	                break;
	            }
	            if (this._state === State$1.STATE_CONTENT && !this.readContent()) {
	                break;
	            }
	        }
	    };
	    EBMLDecoder.prototype.getSchemaInfo = function (tagNum) {
	        return this._schema[tagNum] || {
	            name: "unknown",
	            level: -1,
	            type: "unknown",
	            description: "unknown"
	        };
	    };
	    /**
	     * vint された parsing tag
	     * @return - return false when waiting for more data
	     */
	    EBMLDecoder.prototype.readTag = function () {
	        // tag.length が buffer の外にある
	        if (this._cursor >= this._buffer.length) {
	            return false;
	        }
	        // read ebml id vint without first byte
	        var tag = tools_1$1.readVint(this._buffer, this._cursor);
	        // tag が読めなかった
	        if (tag == null) {
	            return false;
	        }
	        // >>>>>>>>>
	        // tag 識別子
	        //const tagStr = this._buffer.toString("hex", this._cursor, this._cursor + tag.length);
	        //const tagNum = parseInt(tagStr, 16);
	        // 上と等価
	        var buf = this._buffer.slice(this._cursor, this._cursor + tag.length);
	        var tagNum = buf.reduce(function (o, v, i, arr) { return o + v * Math.pow(16, 2 * (arr.length - 1 - i)); }, 0);
	        var schema = this.getSchemaInfo(tagNum);
	        var tagObj = {
	            EBML_ID: tagNum.toString(16),
	            schema: schema,
	            type: schema.type,
	            name: schema.name,
	            level: schema.level,
	            tagStart: this._total,
	            tagEnd: this._total + tag.length,
	            sizeStart: this._total + tag.length,
	            sizeEnd: null,
	            dataStart: null,
	            dataEnd: null,
	            dataSize: null,
	            data: null
	        };
	        // | tag: vint | size: vint | data: Buffer(size) |
	        this._tag_stack.push(tagObj);
	        // <<<<<<<<
	        // ポインタを進める
	        this._cursor += tag.length;
	        this._total += tag.length;
	        // 読み込み状態変更
	        this._state = State$1.STATE_SIZE;
	        return true;
	    };
	    /**
	     * vint された現在のタグの内容の大きさを読み込む
	     * @return - return false when waiting for more data
	     */
	    EBMLDecoder.prototype.readSize = function () {
	        // tag.length が buffer の外にある
	        if (this._cursor >= this._buffer.length) {
	            return false;
	        }
	        // read ebml datasize vint without first byte
	        var size = tools_1$1.readVint(this._buffer, this._cursor);
	        // まだ読めない
	        if (size == null) {
	            return false;
	        }
	        // >>>>>>>>>
	        // current tag の data size 決定
	        var tagObj = this._tag_stack[this._tag_stack.length - 1];
	        tagObj.sizeEnd = tagObj.sizeStart + size.length;
	        tagObj.dataStart = tagObj.sizeEnd;
	        tagObj.dataSize = size.value;
	        if (size.value === -1) {
	            // unknown size
	            tagObj.dataEnd = -1;
	            if (tagObj.type === "m") {
	                tagObj.unknownSize = true;
	            }
	        }
	        else {
	            tagObj.dataEnd = tagObj.sizeEnd + size.value;
	        }
	        // <<<<<<<<
	        // ポインタを進める
	        this._cursor += size.length;
	        this._total += size.length;
	        this._state = State$1.STATE_CONTENT;
	        return true;
	    };
	    /**
	     * データ読み込み
	     */
	    EBMLDecoder.prototype.readContent = function () {
	        var tagObj = this._tag_stack[this._tag_stack.length - 1];
	        // master element は子要素を持つので生データはない
	        if (tagObj.type === 'm') {
	            // console.log('content should be tags');
	            tagObj.isEnd = false;
	            this._result.push(tagObj);
	            this._state = State$1.STATE_TAG;
	            // この Mastert Element は空要素か
	            if (tagObj.dataSize === 0) {
	                // 即座に終了タグを追加
	                var elm = Object.assign({}, tagObj, { isEnd: true });
	                this._result.push(elm);
	                this._tag_stack.pop(); // スタックからこのタグを捨てる
	            }
	            return true;
	        }
	        // waiting for more data
	        if (this._buffer.length < this._cursor + tagObj.dataSize) {
	            return false;
	        }
	        // タグの中身の生データ
	        var data = this._buffer.slice(this._cursor, this._cursor + tagObj.dataSize);
	        // 読み終わったバッファを捨てて読み込んでいる部分のバッファのみ残す
	        this._buffer = this._buffer.slice(this._cursor + tagObj.dataSize);
	        tagObj.data = data;
	        // >>>>>>>>>
	        switch (tagObj.type) {
	            //case "m": break;
	            // Master-Element - contains other EBML sub-elements of the next lower level
	            case "u":
	                tagObj.value = data.readUIntBE(0, data.length);
	                break;
	            // Unsigned Integer - Big-endian, any size from 1 to 8 octets
	            case "i":
	                tagObj.value = data.readIntBE(0, data.length);
	                break;
	            // Signed Integer - Big-endian, any size from 1 to 8 octets
	            case "f":
	                tagObj.value = tagObj.dataSize === 4 ? data.readFloatBE(0) :
	                    tagObj.dataSize === 8 ? data.readDoubleBE(0) :
	                        (console.warn("cannot read " + tagObj.dataSize + " octets float. failback to 0"), 0);
	                break;
	            // Float - Big-endian, defined for 4 and 8 octets (32, 64 bits)
	            case "s":
	                tagObj.value = data.toString("ascii");
	                break; // ascii
	            //  Printable ASCII (0x20 to 0x7E), zero-padded when needed
	            case "8":
	                tagObj.value = data.toString("utf8");
	                break;
	            //  Unicode string, zero padded when needed (RFC 2279)
	            case "b":
	                tagObj.value = data;
	                break;
	            // Binary - not interpreted by the parser
	            case "d":
	                tagObj.value = tools_1$1.convertEBMLDateToJSDate(new int64_buffer_1.Int64BE(data).toNumber());
	                break;
	        }
	        if (tagObj.value === null) {
	            throw new Error("unknown tag type:" + tagObj.type);
	        }
	        this._result.push(tagObj);
	        // <<<<<<<<
	        // ポインタを進める
	        this._total += tagObj.dataSize;
	        // タグ待ちモードに変更
	        this._state = State$1.STATE_TAG;
	        this._cursor = 0;
	        this._tag_stack.pop(); // remove the object from the stack
	        while (this._tag_stack.length > 0) {
	            var topEle = this._tag_stack[this._tag_stack.length - 1];
	            // 親が不定長サイズなので閉じタグは期待できない
	            if (topEle.dataEnd < 0) {
	                this._tag_stack.pop(); // 親タグを捨てる
	                return true;
	            }
	            // 閉じタグの来るべき場所まで来たかどうか
	            if (this._total < topEle.dataEnd) {
	                break;
	            }
	            // 閉じタグを挿入すべきタイミングが来た
	            if (topEle.type !== "m") {
	                throw new Error("parent element is not master element");
	            }
	            var elm = Object.assign({}, topEle, { isEnd: true });
	            this._result.push(elm);
	            this._tag_stack.pop();
	        }
	        return true;
	    };
	    return EBMLDecoder;
	}());
	EBMLDecoder$2.default = EBMLDecoder$1;

	var EBMLReader$1 = {};

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	var events = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}

	var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
	    var extendStatics = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
	    return function (d, b) {
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    };
	})();
	Object.defineProperty(EBMLReader$1, "__esModule", { value: true });
	var events_1 = events;
	var tools$1 = requireTools();
	/**
	 * This is an informal code for reference.
	 * EBMLReader is a class for getting information to enable seeking Webm recorded by MediaRecorder.
	 * So please do not use for regular WebM files.
	 */
	var EBMLReader = (function (_super) {
	    __extends(EBMLReader, _super);
	    function EBMLReader() {
	        var _this = _super.call(this) || this;
	        _this.logGroup = "";
	        _this.hasLoggingStarted = false;
	        _this.metadataloaded = false;
	        _this.chunks = [];
	        _this.stack = [];
	        _this.segmentOffset = 0;
	        _this.last2SimpleBlockVideoTrackTimecode = [0, 0];
	        _this.last2SimpleBlockAudioTrackTimecode = [0, 0];
	        _this.lastClusterTimecode = 0;
	        _this.lastClusterPosition = 0;
	        _this.timecodeScale = 1000000; // webm default TimecodeScale is 1ms
	        _this.metadataSize = 0;
	        _this.metadatas = [];
	        _this.cues = [];
	        _this.firstVideoBlockRead = false;
	        _this.firstAudioBlockRead = false;
	        _this.currentTrack = { TrackNumber: -1, TrackType: -1, DefaultDuration: null, CodecDelay: null };
	        _this.trackTypes = [];
	        _this.trackDefaultDuration = [];
	        _this.trackCodecDelay = [];
	        _this.trackInfo = { type: "nothing" };
	        _this.ended = false;
	        _this.logging = false;
	        _this.use_duration_every_simpleblock = false;
	        _this.use_webp = false;
	        _this.use_segment_info = true;
	        _this.drop_default_duration = true;
	        return _this;
	    }
	    /**
	     * emit final state.
	     */
	    EBMLReader.prototype.stop = function () {
	        this.ended = true;
	        this.emit_segment_info();
	        // clean up any unclosed Master Elements at the end of the stream.
	        while (this.stack.length) {
	            this.stack.pop();
	            if (this.logging) {
	                console.groupEnd();
	            }
	        }
	        // close main group if set, logging is enabled, and has actually logged anything.
	        if (this.logging && this.hasLoggingStarted && this.logGroup) {
	            console.groupEnd();
	        }
	    };
	    /**
	     * emit chunk info
	     */
	    EBMLReader.prototype.emit_segment_info = function () {
	        var data = this.chunks;
	        this.chunks = [];
	        if (!this.metadataloaded) {
	            this.metadataloaded = true;
	            this.metadatas = data;
	            var videoTrackNum = this.trackTypes.indexOf(1); // find first video track
	            var audioTrackNum = this.trackTypes.indexOf(2); // find first audio track
	            this.trackInfo = videoTrackNum >= 0 && audioTrackNum >= 0 ? { type: "both", trackNumber: videoTrackNum }
	                : videoTrackNum >= 0 ? { type: "video", trackNumber: videoTrackNum }
	                    : audioTrackNum >= 0 ? { type: "audio", trackNumber: audioTrackNum }
	                        : { type: "nothing" };
	            if (!this.use_segment_info) {
	                return;
	            }
	            this.emit("metadata", { data: data, metadataSize: this.metadataSize });
	        }
	        else {
	            if (!this.use_segment_info) {
	                return;
	            }
	            var timecode = this.lastClusterTimecode;
	            var duration = this.duration;
	            var timecodeScale = this.timecodeScale;
	            this.emit("cluster", { timecode: timecode, data: data });
	            this.emit("duration", { timecodeScale: timecodeScale, duration: duration });
	        }
	    };
	    EBMLReader.prototype.read = function (elm) {
	        var _this = this;
	        var drop = false;
	        if (this.ended) {
	            // reader is finished
	            return;
	        }
	        if (elm.type === "m") {
	            // 閉じタグの自動挿入
	            if (elm.isEnd) {
	                this.stack.pop();
	            }
	            else {
	                var parent_1 = this.stack[this.stack.length - 1];
	                if (parent_1 != null && parent_1.level >= elm.level) {
	                    // 閉じタグなしでレベルが下がったら閉じタグを挿入
	                    this.stack.pop();
	                    // From http://w3c.github.io/media-source/webm-byte-stream-format.html#webm-media-segments
	                    // This fixes logging for webm streams with Cluster of unknown length and no Cluster closing elements.
	                    if (this.logging) {
	                        console.groupEnd();
	                    }
	                    parent_1.dataEnd = elm.dataEnd;
	                    parent_1.dataSize = elm.dataEnd - parent_1.dataStart;
	                    parent_1.unknownSize = false;
	                    var o = Object.assign({}, parent_1, { name: parent_1.name, type: parent_1.type, isEnd: true });
	                    this.chunks.push(o);
	                }
	                this.stack.push(elm);
	            }
	        }
	        if (elm.type === "m" && elm.name == "Segment") {
	            if (this.segmentOffset != 0) {
	                console.warn("Multiple segments detected!");
	            }
	            this.segmentOffset = elm.dataStart;
	            this.emit("segment_offset", this.segmentOffset);
	        }
	        else if (elm.type === "b" && elm.name === "SimpleBlock") {
	            var _a = tools$1.ebmlBlock(elm.data), timecode = _a.timecode, trackNumber = _a.trackNumber, frames_1 = _a.frames;
	            if (this.trackTypes[trackNumber] === 1) {
	                if (!this.firstVideoBlockRead) {
	                    this.firstVideoBlockRead = true;
	                    if (this.trackInfo.type === "both" || this.trackInfo.type === "video") {
	                        var CueTime = this.lastClusterTimecode + timecode;
	                        this.cues.push({ CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: CueTime });
	                        this.emit("cue_info", { CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: this.lastClusterTimecode });
	                        this.emit("cue", { CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: CueTime });
	                    }
	                }
	                this.last2SimpleBlockVideoTrackTimecode = [this.last2SimpleBlockVideoTrackTimecode[1], timecode];
	            }
	            else if (this.trackTypes[trackNumber] === 2) {
	                if (!this.firstAudioBlockRead) {
	                    this.firstAudioBlockRead = true;
	                    if (this.trackInfo.type === "audio") {
	                        var CueTime = this.lastClusterTimecode + timecode;
	                        this.cues.push({ CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: CueTime });
	                        this.emit("cue_info", { CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: this.lastClusterTimecode });
	                        this.emit("cue", { CueTrack: trackNumber, CueClusterPosition: this.lastClusterPosition, CueTime: CueTime });
	                    }
	                }
	                this.last2SimpleBlockAudioTrackTimecode = [this.last2SimpleBlockAudioTrackTimecode[1], timecode];
	            }
	            if (this.use_duration_every_simpleblock) {
	                this.emit("duration", { timecodeScale: this.timecodeScale, duration: this.duration });
	            }
	            if (this.use_webp) {
	                frames_1.forEach(function (frame) {
	                    var startcode = frame.slice(3, 6).toString("hex");
	                    if (startcode !== "9d012a") {
	                        return;
	                    }
	                    var webpBuf = tools$1.VP8BitStreamToRiffWebPBuffer(frame);
	                    var webp = new Blob([webpBuf], { type: "image/webp" });
	                    var currentTime = _this.duration;
	                    _this.emit("webp", { currentTime: currentTime, webp: webp });
	                });
	            }
	        }
	        else if (elm.type === "m" && elm.name === "Cluster" && elm.isEnd === false) {
	            this.firstVideoBlockRead = false;
	            this.firstAudioBlockRead = false;
	            this.emit_segment_info();
	            this.emit("cluster_ptr", elm.tagStart);
	            this.lastClusterPosition = elm.tagStart;
	        }
	        else if (elm.type === "u" && elm.name === "Timecode") {
	            this.lastClusterTimecode = elm.value;
	        }
	        else if (elm.type === "u" && elm.name === "TimecodeScale") {
	            this.timecodeScale = elm.value;
	        }
	        else if (elm.type === "m" && elm.name === "TrackEntry") {
	            if (elm.isEnd) {
	                this.trackTypes[this.currentTrack.TrackNumber] = this.currentTrack.TrackType;
	                this.trackDefaultDuration[this.currentTrack.TrackNumber] = this.currentTrack.DefaultDuration;
	                this.trackCodecDelay[this.currentTrack.TrackNumber] = this.currentTrack.CodecDelay;
	            }
	            else {
	                this.currentTrack = { TrackNumber: -1, TrackType: -1, DefaultDuration: null, CodecDelay: null };
	            }
	        }
	        else if (elm.type === "u" && elm.name === "TrackType") {
	            this.currentTrack.TrackType = elm.value;
	        }
	        else if (elm.type === "u" && elm.name === "TrackNumber") {
	            this.currentTrack.TrackNumber = elm.value;
	        }
	        else if (elm.type === "u" && elm.name === "CodecDelay") {
	            this.currentTrack.CodecDelay = elm.value;
	        }
	        else if (elm.type === "u" && elm.name === "DefaultDuration") {
	            // media source api は DefaultDuration を計算するとバグる。
	            // https://bugs.chromium.org/p/chromium/issues/detail?id=606000#c22
	            // chrome 58 ではこれを回避するために DefaultDuration 要素を抜き取った。
	            // chrome 58 以前でもこのタグを抜き取ることで回避できる
	            if (this.drop_default_duration) {
	                console.warn("DefaultDuration detected!, remove it");
	                drop = true;
	            }
	            else {
	                this.currentTrack.DefaultDuration = elm.value;
	            }
	        }
	        else if (elm.name === "unknown") {
	            console.warn(elm);
	        }
	        if (!this.metadataloaded && elm.dataEnd > 0) {
	            this.metadataSize = elm.dataEnd;
	        }
	        if (!drop) {
	            this.chunks.push(elm);
	        }
	        if (this.logging) {
	            this.put(elm);
	        }
	    };
	    Object.defineProperty(EBMLReader.prototype, "duration", {
	        /**
	         * DefaultDuration が定義されている場合は最後のフレームのdurationも考慮する
	         * 単位 timecodeScale
	         *
	         * !!! if you need duration with seconds !!!
	         * ```js
	         * const nanosec = reader.duration * reader.timecodeScale;
	         * const sec = nanosec / 1000 / 1000 / 1000;
	         * ```
	         */
	        get: function () {
	            if (this.trackInfo.type === "nothing") {
	                console.warn("no video, no audio track");
	                return 0;
	            }
	            // defaultDuration は 生の nano sec
	            var defaultDuration = 0;
	            // nanoseconds
	            var codecDelay = 0;
	            var lastTimecode = 0;
	            var _defaultDuration = this.trackDefaultDuration[this.trackInfo.trackNumber];
	            if (typeof _defaultDuration === "number") {
	                defaultDuration = _defaultDuration;
	            }
	            else {
	                // https://bugs.chromium.org/p/chromium/issues/detail?id=606000#c22
	                // default duration がないときに使う delta
	                if (this.trackInfo.type === "both") {
	                    if (this.last2SimpleBlockAudioTrackTimecode[1] > this.last2SimpleBlockVideoTrackTimecode[1]) {
	                        // audio diff
	                        defaultDuration = (this.last2SimpleBlockAudioTrackTimecode[1] - this.last2SimpleBlockAudioTrackTimecode[0]) * this.timecodeScale;
	                        // audio delay
	                        var delay = this.trackCodecDelay[this.trackTypes.indexOf(2)]; // 2 => audio
	                        if (typeof delay === "number") {
	                            codecDelay = delay;
	                        }
	                        // audio timecode
	                        lastTimecode = this.last2SimpleBlockAudioTrackTimecode[1];
	                    }
	                    else {
	                        // video diff
	                        defaultDuration = (this.last2SimpleBlockVideoTrackTimecode[1] - this.last2SimpleBlockVideoTrackTimecode[0]) * this.timecodeScale;
	                        // video delay
	                        var delay = this.trackCodecDelay[this.trackTypes.indexOf(1)]; // 1 => video
	                        if (typeof delay === "number") {
	                            codecDelay = delay;
	                        }
	                        // video timecode
	                        lastTimecode = this.last2SimpleBlockVideoTrackTimecode[1];
	                    }
	                }
	                else if (this.trackInfo.type === "video") {
	                    defaultDuration = (this.last2SimpleBlockVideoTrackTimecode[1] - this.last2SimpleBlockVideoTrackTimecode[0]) * this.timecodeScale;
	                    var delay = this.trackCodecDelay[this.trackInfo.trackNumber]; // 2 => audio
	                    if (typeof delay === "number") {
	                        codecDelay = delay;
	                    }
	                    lastTimecode = this.last2SimpleBlockVideoTrackTimecode[1];
	                }
	                else if (this.trackInfo.type === "audio") {
	                    defaultDuration = (this.last2SimpleBlockAudioTrackTimecode[1] - this.last2SimpleBlockAudioTrackTimecode[0]) * this.timecodeScale;
	                    var delay = this.trackCodecDelay[this.trackInfo.trackNumber]; // 1 => video
	                    if (typeof delay === "number") {
	                        codecDelay = delay;
	                    }
	                    lastTimecode = this.last2SimpleBlockAudioTrackTimecode[1];
	                } // else { not reached }
	            }
	            // convert to timecodescale
	            var duration_nanosec = ((this.lastClusterTimecode + lastTimecode) * this.timecodeScale) + defaultDuration - codecDelay;
	            var duration = duration_nanosec / this.timecodeScale;
	            return Math.floor(duration);
	        },
	        enumerable: true,
	        configurable: true
	    });
	    EBMLReader.prototype.addListener = function (event, listener) {
	        return _super.prototype.addListener.call(this, event, listener);
	    };
	    EBMLReader.prototype.put = function (elm) {
	        if (!this.hasLoggingStarted) {
	            this.hasLoggingStarted = true;
	            if (this.logging && this.logGroup) {
	                console.groupCollapsed(this.logGroup);
	            }
	        }
	        if (elm.type === "m") {
	            if (elm.isEnd) {
	                console.groupEnd();
	            }
	            else {
	                console.group(elm.name + ":" + elm.tagStart);
	            }
	        }
	        else if (elm.type === "b") {
	            // for debug
	            //if(elm.name === "SimpleBlock"){
	            //const o = EBML.tools.ebmlBlock(elm.value);
	            //console.log(elm.name, elm.type, o.trackNumber, o.timecode);
	            //}else{
	            console.log(elm.name, elm.type);
	            //}
	        }
	        else {
	            console.log(elm.name, elm.tagStart, elm.type, elm.value);
	        }
	    };
	    return EBMLReader;
	}(events_1.EventEmitter));
	EBMLReader$1.default = EBMLReader;

	var name = "ts-ebml";
	var version$1 = "2.0.2";
	var description = "ebml decoder and encoder";
	var scripts = {
		setup: "npm install -g http-server;",
		init: "npm run update; npm run mkdir; npm run build",
		update: "npm run reset; npm update",
		reset: "rm -rf node_modules",
		mkdir: "mkdir lib dist 2>/dev/null",
		clean: "rm -rf lib/* dist/* test/*.js; mkdir -p dist",
		build: "npm run clean   && tsc    -p .; npm run browserify",
		start: "http-server . -s & tsc -w -p .& watchify lib/example_seekable.js -o test/example_seekable.js",
		stop: "killall -- node */tsc -w -p",
		browserify: "browserify lib/index.js --standalone EBML -o dist/EBML.js",
		watchify: "watchify lib/index.js --standalone EBML -o dist/EBMl.js -v",
		test: "tsc; espower lib/test.js > lib/test.tmp; mv -f lib/test.tmp lib/test.js; browserify lib/test.js -o test/test.js",
		example: "tsc; browserify lib/example_seekable.js -o test/example_seekable.js",
		examples: "tsc; for file in `find lib -name 'example_*.js' -type f -printf '%f\\n'`; do browserify lib/$file -o test/$file; done",
		examples_bsd: "tsc; for file in `find lib -name 'example_*.js' -type f -print`; do browserify lib/$(basename $file) -o test/$(basename $file); done",
		check: "tsc -w --noEmit -p ./",
		lint: "tslint -c ./tslint.json --project ./tsconfig.json --type-check",
		doc: "typedoc --mode modules --out doc --disableOutputCheck"
	};
	var repository = {
		type: "git",
		url: "git+https://github.com/legokichi/ts-ebml.git"
	};
	var keywords = [
		"ebml",
		"webm",
		"mkv",
		"matrosika",
		"webp"
	];
	var author = "legokichi duckscallion";
	var license = "MIT";
	var bugs = {
		url: "https://github.com/legokichi/ts-ebml/issues"
	};
	var homepage = "https://github.com/legokichi/ts-ebml#readme";
	var dependencies = {
		buffer: "^5.0.7",
		commander: "^2.11.0",
		ebml: "^2.2.1",
		"ebml-block": "^1.1.0",
		events: "^1.1.1",
		"int64-buffer": "^0.1.9",
		matroska: "^2.2.3"
	};
	var devDependencies = {
		"@types/commander": "^2.9.1",
		"@types/qunit": "^2.0.31",
		browserify: "^13.1.0",
		empower: "^1.2.3",
		"espower-cli": "^1.1.0",
		"power-assert": "^1.4.4",
		"power-assert-formatter": "^1.4.1",
		"qunit-tap": "^1.5.1",
		qunitjs: "^2.4.0",
		tslint: "^3.15.1",
		typedoc: "^0.5.3",
		typescript: "^2.4.2",
		watchify: "^3.7.0"
	};
	var bin = "./lib/cli.js";
	var main = "./lib/index.js";
	var typings = "./lib/index.d.ts";
	var require$$4 = {
		name: name,
		version: version$1,
		description: description,
		scripts: scripts,
		repository: repository,
		keywords: keywords,
		author: author,
		license: license,
		bugs: bugs,
		homepage: homepage,
		dependencies: dependencies,
		devDependencies: devDependencies,
		bin: bin,
		main: main,
		typings: typings
	};

	Object.defineProperty(lib, "__esModule", { value: true });
	var EBMLDecoder_1 = EBMLDecoder$2;
	lib.Decoder = EBMLDecoder_1.default;
	var EBMLEncoder_1 = requireEBMLEncoder();
	lib.Encoder = EBMLEncoder_1.default;
	var EBMLReader_1 = EBMLReader$1;
	var Reader = lib.Reader = EBMLReader_1.default;
	var tools = requireTools();
	var tools_1 = lib.tools = tools;
	var version = require$$4.version;
	lib.version = version;

	var buffer = {};

	var base64Js = {};

	base64Js.byteLength = byteLength;
	base64Js.toByteArray = toByteArray;
	base64Js.fromByteArray = fromByteArray;

	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i];
	  revLookup[code.charCodeAt(i)] = i;
	}

	// Support decoding URL-safe base64 strings, as Node.js does.
	// See: https://en.wikipedia.org/wiki/Base64#URL_applications
	revLookup['-'.charCodeAt(0)] = 62;
	revLookup['_'.charCodeAt(0)] = 63;

	function getLens (b64) {
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // Trim off extra bytes after placeholder bytes are found
	  // See: https://github.com/beatgammit/base64-js/issues/42
	  var validLen = b64.indexOf('=');
	  if (validLen === -1) validLen = len;

	  var placeHoldersLen = validLen === len
	    ? 0
	    : 4 - (validLen % 4);

	  return [validLen, placeHoldersLen]
	}

	// base64 is 4/3 + up to two characters of the original data
	function byteLength (b64) {
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function _byteLength (b64, validLen, placeHoldersLen) {
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function toByteArray (b64) {
	  var tmp;
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];

	  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

	  var curByte = 0;

	  // if there are placeholders, only get up to the last complete 4 chars
	  var len = placeHoldersLen > 0
	    ? validLen - 4
	    : validLen;

	  var i;
	  for (i = 0; i < len; i += 4) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 18) |
	      (revLookup[b64.charCodeAt(i + 1)] << 12) |
	      (revLookup[b64.charCodeAt(i + 2)] << 6) |
	      revLookup[b64.charCodeAt(i + 3)];
	    arr[curByte++] = (tmp >> 16) & 0xFF;
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 2) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 2) |
	      (revLookup[b64.charCodeAt(i + 1)] >> 4);
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 1) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 10) |
	      (revLookup[b64.charCodeAt(i + 1)] << 4) |
	      (revLookup[b64.charCodeAt(i + 2)] >> 2);
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] +
	    lookup[num >> 12 & 0x3F] +
	    lookup[num >> 6 & 0x3F] +
	    lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp =
	      ((uint8[i] << 16) & 0xFF0000) +
	      ((uint8[i + 1] << 8) & 0xFF00) +
	      (uint8[i + 2] & 0xFF);
	    output.push(tripletToBase64(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 2] +
	      lookup[(tmp << 4) & 0x3F] +
	      '=='
	    );
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 10] +
	      lookup[(tmp >> 4) & 0x3F] +
	      lookup[(tmp << 2) & 0x3F] +
	      '='
	    );
	  }

	  return parts.join('')
	}

	var ieee754 = {};

	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

	ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var nBits = -7;
	  var i = isLE ? (nBytes - 1) : 0;
	  var d = isLE ? -1 : 1;
	  var s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	};

	ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
	  var i = isLE ? 0 : (nBytes - 1);
	  var d = isLE ? 1 : -1;
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = ((value * c) - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128;
	};

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */

	(function (exports) {

		var base64 = base64Js;
		var ieee754$1 = ieee754;
		var customInspectSymbol =
		  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
		    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
		    : null;

		exports.Buffer = Buffer;
		exports.SlowBuffer = SlowBuffer;
		exports.INSPECT_MAX_BYTES = 50;

		var K_MAX_LENGTH = 0x7fffffff;
		exports.kMaxLength = K_MAX_LENGTH;

		/**
		 * If `Buffer.TYPED_ARRAY_SUPPORT`:
		 *   === true    Use Uint8Array implementation (fastest)
		 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
		 *               implementation (most compatible, even IE6)
		 *
		 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
		 * Opera 11.6+, iOS 4.2+.
		 *
		 * We report that the browser does not support typed arrays if the are not subclassable
		 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
		 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
		 * for __proto__ and has a buggy typed array implementation.
		 */
		Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

		if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
		    typeof console.error === 'function') {
		  console.error(
		    'This browser lacks typed array (Uint8Array) support which is required by ' +
		    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
		  );
		}

		function typedArraySupport () {
		  // Can typed array instances can be augmented?
		  try {
		    var arr = new Uint8Array(1);
		    var proto = { foo: function () { return 42 } };
		    Object.setPrototypeOf(proto, Uint8Array.prototype);
		    Object.setPrototypeOf(arr, proto);
		    return arr.foo() === 42
		  } catch (e) {
		    return false
		  }
		}

		Object.defineProperty(Buffer.prototype, 'parent', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.buffer
		  }
		});

		Object.defineProperty(Buffer.prototype, 'offset', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.byteOffset
		  }
		});

		function createBuffer (length) {
		  if (length > K_MAX_LENGTH) {
		    throw new RangeError('The value "' + length + '" is invalid for option "size"')
		  }
		  // Return an augmented `Uint8Array` instance
		  var buf = new Uint8Array(length);
		  Object.setPrototypeOf(buf, Buffer.prototype);
		  return buf
		}

		/**
		 * The Buffer constructor returns instances of `Uint8Array` that have their
		 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
		 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
		 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
		 * returns a single octet.
		 *
		 * The `Uint8Array` prototype remains unmodified.
		 */

		function Buffer (arg, encodingOrOffset, length) {
		  // Common case.
		  if (typeof arg === 'number') {
		    if (typeof encodingOrOffset === 'string') {
		      throw new TypeError(
		        'The "string" argument must be of type string. Received type number'
		      )
		    }
		    return allocUnsafe(arg)
		  }
		  return from(arg, encodingOrOffset, length)
		}

		Buffer.poolSize = 8192; // not used by this implementation

		function from (value, encodingOrOffset, length) {
		  if (typeof value === 'string') {
		    return fromString(value, encodingOrOffset)
		  }

		  if (ArrayBuffer.isView(value)) {
		    return fromArrayView(value)
		  }

		  if (value == null) {
		    throw new TypeError(
		      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		      'or Array-like Object. Received type ' + (typeof value)
		    )
		  }

		  if (isInstance(value, ArrayBuffer) ||
		      (value && isInstance(value.buffer, ArrayBuffer))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof SharedArrayBuffer !== 'undefined' &&
		      (isInstance(value, SharedArrayBuffer) ||
		      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof value === 'number') {
		    throw new TypeError(
		      'The "value" argument must not be of type number. Received type number'
		    )
		  }

		  var valueOf = value.valueOf && value.valueOf();
		  if (valueOf != null && valueOf !== value) {
		    return Buffer.from(valueOf, encodingOrOffset, length)
		  }

		  var b = fromObject(value);
		  if (b) return b

		  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
		      typeof value[Symbol.toPrimitive] === 'function') {
		    return Buffer.from(
		      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
		    )
		  }

		  throw new TypeError(
		    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		    'or Array-like Object. Received type ' + (typeof value)
		  )
		}

		/**
		 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
		 * if value is a number.
		 * Buffer.from(str[, encoding])
		 * Buffer.from(array)
		 * Buffer.from(buffer)
		 * Buffer.from(arrayBuffer[, byteOffset[, length]])
		 **/
		Buffer.from = function (value, encodingOrOffset, length) {
		  return from(value, encodingOrOffset, length)
		};

		// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
		// https://github.com/feross/buffer/pull/148
		Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
		Object.setPrototypeOf(Buffer, Uint8Array);

		function assertSize (size) {
		  if (typeof size !== 'number') {
		    throw new TypeError('"size" argument must be of type number')
		  } else if (size < 0) {
		    throw new RangeError('The value "' + size + '" is invalid for option "size"')
		  }
		}

		function alloc (size, fill, encoding) {
		  assertSize(size);
		  if (size <= 0) {
		    return createBuffer(size)
		  }
		  if (fill !== undefined) {
		    // Only pay attention to encoding if it's a string. This
		    // prevents accidentally sending in a number that would
		    // be interpreted as a start offset.
		    return typeof encoding === 'string'
		      ? createBuffer(size).fill(fill, encoding)
		      : createBuffer(size).fill(fill)
		  }
		  return createBuffer(size)
		}

		/**
		 * Creates a new filled Buffer instance.
		 * alloc(size[, fill[, encoding]])
		 **/
		Buffer.alloc = function (size, fill, encoding) {
		  return alloc(size, fill, encoding)
		};

		function allocUnsafe (size) {
		  assertSize(size);
		  return createBuffer(size < 0 ? 0 : checked(size) | 0)
		}

		/**
		 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
		 * */
		Buffer.allocUnsafe = function (size) {
		  return allocUnsafe(size)
		};
		/**
		 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
		 */
		Buffer.allocUnsafeSlow = function (size) {
		  return allocUnsafe(size)
		};

		function fromString (string, encoding) {
		  if (typeof encoding !== 'string' || encoding === '') {
		    encoding = 'utf8';
		  }

		  if (!Buffer.isEncoding(encoding)) {
		    throw new TypeError('Unknown encoding: ' + encoding)
		  }

		  var length = byteLength(string, encoding) | 0;
		  var buf = createBuffer(length);

		  var actual = buf.write(string, encoding);

		  if (actual !== length) {
		    // Writing a hex string, for example, that contains invalid characters will
		    // cause everything after the first invalid character to be ignored. (e.g.
		    // 'abxxcd' will be treated as 'ab')
		    buf = buf.slice(0, actual);
		  }

		  return buf
		}

		function fromArrayLike (array) {
		  var length = array.length < 0 ? 0 : checked(array.length) | 0;
		  var buf = createBuffer(length);
		  for (var i = 0; i < length; i += 1) {
		    buf[i] = array[i] & 255;
		  }
		  return buf
		}

		function fromArrayView (arrayView) {
		  if (isInstance(arrayView, Uint8Array)) {
		    var copy = new Uint8Array(arrayView);
		    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
		  }
		  return fromArrayLike(arrayView)
		}

		function fromArrayBuffer (array, byteOffset, length) {
		  if (byteOffset < 0 || array.byteLength < byteOffset) {
		    throw new RangeError('"offset" is outside of buffer bounds')
		  }

		  if (array.byteLength < byteOffset + (length || 0)) {
		    throw new RangeError('"length" is outside of buffer bounds')
		  }

		  var buf;
		  if (byteOffset === undefined && length === undefined) {
		    buf = new Uint8Array(array);
		  } else if (length === undefined) {
		    buf = new Uint8Array(array, byteOffset);
		  } else {
		    buf = new Uint8Array(array, byteOffset, length);
		  }

		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(buf, Buffer.prototype);

		  return buf
		}

		function fromObject (obj) {
		  if (Buffer.isBuffer(obj)) {
		    var len = checked(obj.length) | 0;
		    var buf = createBuffer(len);

		    if (buf.length === 0) {
		      return buf
		    }

		    obj.copy(buf, 0, 0, len);
		    return buf
		  }

		  if (obj.length !== undefined) {
		    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
		      return createBuffer(0)
		    }
		    return fromArrayLike(obj)
		  }

		  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
		    return fromArrayLike(obj.data)
		  }
		}

		function checked (length) {
		  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
		  // length is NaN (which is otherwise coerced to zero.)
		  if (length >= K_MAX_LENGTH) {
		    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
		                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
		  }
		  return length | 0
		}

		function SlowBuffer (length) {
		  if (+length != length) { // eslint-disable-line eqeqeq
		    length = 0;
		  }
		  return Buffer.alloc(+length)
		}

		Buffer.isBuffer = function isBuffer (b) {
		  return b != null && b._isBuffer === true &&
		    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
		};

		Buffer.compare = function compare (a, b) {
		  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
		  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
		  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
		    throw new TypeError(
		      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
		    )
		  }

		  if (a === b) return 0

		  var x = a.length;
		  var y = b.length;

		  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
		    if (a[i] !== b[i]) {
		      x = a[i];
		      y = b[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		Buffer.isEncoding = function isEncoding (encoding) {
		  switch (String(encoding).toLowerCase()) {
		    case 'hex':
		    case 'utf8':
		    case 'utf-8':
		    case 'ascii':
		    case 'latin1':
		    case 'binary':
		    case 'base64':
		    case 'ucs2':
		    case 'ucs-2':
		    case 'utf16le':
		    case 'utf-16le':
		      return true
		    default:
		      return false
		  }
		};

		Buffer.concat = function concat (list, length) {
		  if (!Array.isArray(list)) {
		    throw new TypeError('"list" argument must be an Array of Buffers')
		  }

		  if (list.length === 0) {
		    return Buffer.alloc(0)
		  }

		  var i;
		  if (length === undefined) {
		    length = 0;
		    for (i = 0; i < list.length; ++i) {
		      length += list[i].length;
		    }
		  }

		  var buffer = Buffer.allocUnsafe(length);
		  var pos = 0;
		  for (i = 0; i < list.length; ++i) {
		    var buf = list[i];
		    if (isInstance(buf, Uint8Array)) {
		      if (pos + buf.length > buffer.length) {
		        Buffer.from(buf).copy(buffer, pos);
		      } else {
		        Uint8Array.prototype.set.call(
		          buffer,
		          buf,
		          pos
		        );
		      }
		    } else if (!Buffer.isBuffer(buf)) {
		      throw new TypeError('"list" argument must be an Array of Buffers')
		    } else {
		      buf.copy(buffer, pos);
		    }
		    pos += buf.length;
		  }
		  return buffer
		};

		function byteLength (string, encoding) {
		  if (Buffer.isBuffer(string)) {
		    return string.length
		  }
		  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
		    return string.byteLength
		  }
		  if (typeof string !== 'string') {
		    throw new TypeError(
		      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
		      'Received type ' + typeof string
		    )
		  }

		  var len = string.length;
		  var mustMatch = (arguments.length > 2 && arguments[2] === true);
		  if (!mustMatch && len === 0) return 0

		  // Use a for loop to avoid recursion
		  var loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return len
		      case 'utf8':
		      case 'utf-8':
		        return utf8ToBytes(string).length
		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return len * 2
		      case 'hex':
		        return len >>> 1
		      case 'base64':
		        return base64ToBytes(string).length
		      default:
		        if (loweredCase) {
		          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
		        }
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		}
		Buffer.byteLength = byteLength;

		function slowToString (encoding, start, end) {
		  var loweredCase = false;

		  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
		  // property of a typed array.

		  // This behaves neither like String nor Uint8Array in that we set start/end
		  // to their upper/lower bounds if the value passed is out of range.
		  // undefined is handled specially as per ECMA-262 6th Edition,
		  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
		  if (start === undefined || start < 0) {
		    start = 0;
		  }
		  // Return early if start > this.length. Done here to prevent potential uint32
		  // coercion fail below.
		  if (start > this.length) {
		    return ''
		  }

		  if (end === undefined || end > this.length) {
		    end = this.length;
		  }

		  if (end <= 0) {
		    return ''
		  }

		  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
		  end >>>= 0;
		  start >>>= 0;

		  if (end <= start) {
		    return ''
		  }

		  if (!encoding) encoding = 'utf8';

		  while (true) {
		    switch (encoding) {
		      case 'hex':
		        return hexSlice(this, start, end)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Slice(this, start, end)

		      case 'ascii':
		        return asciiSlice(this, start, end)

		      case 'latin1':
		      case 'binary':
		        return latin1Slice(this, start, end)

		      case 'base64':
		        return base64Slice(this, start, end)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return utf16leSlice(this, start, end)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = (encoding + '').toLowerCase();
		        loweredCase = true;
		    }
		  }
		}

		// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
		// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
		// reliably in a browserify context because there could be multiple different
		// copies of the 'buffer' package in use. This method works even for Buffer
		// instances that were created from another copy of the `buffer` package.
		// See: https://github.com/feross/buffer/issues/154
		Buffer.prototype._isBuffer = true;

		function swap (b, n, m) {
		  var i = b[n];
		  b[n] = b[m];
		  b[m] = i;
		}

		Buffer.prototype.swap16 = function swap16 () {
		  var len = this.length;
		  if (len % 2 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 16-bits')
		  }
		  for (var i = 0; i < len; i += 2) {
		    swap(this, i, i + 1);
		  }
		  return this
		};

		Buffer.prototype.swap32 = function swap32 () {
		  var len = this.length;
		  if (len % 4 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 32-bits')
		  }
		  for (var i = 0; i < len; i += 4) {
		    swap(this, i, i + 3);
		    swap(this, i + 1, i + 2);
		  }
		  return this
		};

		Buffer.prototype.swap64 = function swap64 () {
		  var len = this.length;
		  if (len % 8 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 64-bits')
		  }
		  for (var i = 0; i < len; i += 8) {
		    swap(this, i, i + 7);
		    swap(this, i + 1, i + 6);
		    swap(this, i + 2, i + 5);
		    swap(this, i + 3, i + 4);
		  }
		  return this
		};

		Buffer.prototype.toString = function toString () {
		  var length = this.length;
		  if (length === 0) return ''
		  if (arguments.length === 0) return utf8Slice(this, 0, length)
		  return slowToString.apply(this, arguments)
		};

		Buffer.prototype.toLocaleString = Buffer.prototype.toString;

		Buffer.prototype.equals = function equals (b) {
		  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
		  if (this === b) return true
		  return Buffer.compare(this, b) === 0
		};

		Buffer.prototype.inspect = function inspect () {
		  var str = '';
		  var max = exports.INSPECT_MAX_BYTES;
		  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
		  if (this.length > max) str += ' ... ';
		  return '<Buffer ' + str + '>'
		};
		if (customInspectSymbol) {
		  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
		}

		Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
		  if (isInstance(target, Uint8Array)) {
		    target = Buffer.from(target, target.offset, target.byteLength);
		  }
		  if (!Buffer.isBuffer(target)) {
		    throw new TypeError(
		      'The "target" argument must be one of type Buffer or Uint8Array. ' +
		      'Received type ' + (typeof target)
		    )
		  }

		  if (start === undefined) {
		    start = 0;
		  }
		  if (end === undefined) {
		    end = target ? target.length : 0;
		  }
		  if (thisStart === undefined) {
		    thisStart = 0;
		  }
		  if (thisEnd === undefined) {
		    thisEnd = this.length;
		  }

		  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
		    throw new RangeError('out of range index')
		  }

		  if (thisStart >= thisEnd && start >= end) {
		    return 0
		  }
		  if (thisStart >= thisEnd) {
		    return -1
		  }
		  if (start >= end) {
		    return 1
		  }

		  start >>>= 0;
		  end >>>= 0;
		  thisStart >>>= 0;
		  thisEnd >>>= 0;

		  if (this === target) return 0

		  var x = thisEnd - thisStart;
		  var y = end - start;
		  var len = Math.min(x, y);

		  var thisCopy = this.slice(thisStart, thisEnd);
		  var targetCopy = target.slice(start, end);

		  for (var i = 0; i < len; ++i) {
		    if (thisCopy[i] !== targetCopy[i]) {
		      x = thisCopy[i];
		      y = targetCopy[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
		// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
		//
		// Arguments:
		// - buffer - a Buffer to search
		// - val - a string, Buffer, or number
		// - byteOffset - an index into `buffer`; will be clamped to an int32
		// - encoding - an optional encoding, relevant is val is a string
		// - dir - true for indexOf, false for lastIndexOf
		function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
		  // Empty buffer means no match
		  if (buffer.length === 0) return -1

		  // Normalize byteOffset
		  if (typeof byteOffset === 'string') {
		    encoding = byteOffset;
		    byteOffset = 0;
		  } else if (byteOffset > 0x7fffffff) {
		    byteOffset = 0x7fffffff;
		  } else if (byteOffset < -0x80000000) {
		    byteOffset = -0x80000000;
		  }
		  byteOffset = +byteOffset; // Coerce to Number.
		  if (numberIsNaN(byteOffset)) {
		    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
		    byteOffset = dir ? 0 : (buffer.length - 1);
		  }

		  // Normalize byteOffset: negative offsets start from the end of the buffer
		  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
		  if (byteOffset >= buffer.length) {
		    if (dir) return -1
		    else byteOffset = buffer.length - 1;
		  } else if (byteOffset < 0) {
		    if (dir) byteOffset = 0;
		    else return -1
		  }

		  // Normalize val
		  if (typeof val === 'string') {
		    val = Buffer.from(val, encoding);
		  }

		  // Finally, search either indexOf (if dir is true) or lastIndexOf
		  if (Buffer.isBuffer(val)) {
		    // Special case: looking for empty string/buffer always fails
		    if (val.length === 0) {
		      return -1
		    }
		    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
		  } else if (typeof val === 'number') {
		    val = val & 0xFF; // Search for a byte value [0-255]
		    if (typeof Uint8Array.prototype.indexOf === 'function') {
		      if (dir) {
		        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
		      } else {
		        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
		      }
		    }
		    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
		  }

		  throw new TypeError('val must be string, number or Buffer')
		}

		function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
		  var indexSize = 1;
		  var arrLength = arr.length;
		  var valLength = val.length;

		  if (encoding !== undefined) {
		    encoding = String(encoding).toLowerCase();
		    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
		        encoding === 'utf16le' || encoding === 'utf-16le') {
		      if (arr.length < 2 || val.length < 2) {
		        return -1
		      }
		      indexSize = 2;
		      arrLength /= 2;
		      valLength /= 2;
		      byteOffset /= 2;
		    }
		  }

		  function read (buf, i) {
		    if (indexSize === 1) {
		      return buf[i]
		    } else {
		      return buf.readUInt16BE(i * indexSize)
		    }
		  }

		  var i;
		  if (dir) {
		    var foundIndex = -1;
		    for (i = byteOffset; i < arrLength; i++) {
		      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
		        if (foundIndex === -1) foundIndex = i;
		        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
		      } else {
		        if (foundIndex !== -1) i -= i - foundIndex;
		        foundIndex = -1;
		      }
		    }
		  } else {
		    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
		    for (i = byteOffset; i >= 0; i--) {
		      var found = true;
		      for (var j = 0; j < valLength; j++) {
		        if (read(arr, i + j) !== read(val, j)) {
		          found = false;
		          break
		        }
		      }
		      if (found) return i
		    }
		  }

		  return -1
		}

		Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
		  return this.indexOf(val, byteOffset, encoding) !== -1
		};

		Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
		};

		Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
		};

		function hexWrite (buf, string, offset, length) {
		  offset = Number(offset) || 0;
		  var remaining = buf.length - offset;
		  if (!length) {
		    length = remaining;
		  } else {
		    length = Number(length);
		    if (length > remaining) {
		      length = remaining;
		    }
		  }

		  var strLen = string.length;

		  if (length > strLen / 2) {
		    length = strLen / 2;
		  }
		  for (var i = 0; i < length; ++i) {
		    var parsed = parseInt(string.substr(i * 2, 2), 16);
		    if (numberIsNaN(parsed)) return i
		    buf[offset + i] = parsed;
		  }
		  return i
		}

		function utf8Write (buf, string, offset, length) {
		  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
		}

		function asciiWrite (buf, string, offset, length) {
		  return blitBuffer(asciiToBytes(string), buf, offset, length)
		}

		function base64Write (buf, string, offset, length) {
		  return blitBuffer(base64ToBytes(string), buf, offset, length)
		}

		function ucs2Write (buf, string, offset, length) {
		  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
		}

		Buffer.prototype.write = function write (string, offset, length, encoding) {
		  // Buffer#write(string)
		  if (offset === undefined) {
		    encoding = 'utf8';
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, encoding)
		  } else if (length === undefined && typeof offset === 'string') {
		    encoding = offset;
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, offset[, length][, encoding])
		  } else if (isFinite(offset)) {
		    offset = offset >>> 0;
		    if (isFinite(length)) {
		      length = length >>> 0;
		      if (encoding === undefined) encoding = 'utf8';
		    } else {
		      encoding = length;
		      length = undefined;
		    }
		  } else {
		    throw new Error(
		      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
		    )
		  }

		  var remaining = this.length - offset;
		  if (length === undefined || length > remaining) length = remaining;

		  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
		    throw new RangeError('Attempt to write outside buffer bounds')
		  }

		  if (!encoding) encoding = 'utf8';

		  var loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'hex':
		        return hexWrite(this, string, offset, length)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Write(this, string, offset, length)

		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return asciiWrite(this, string, offset, length)

		      case 'base64':
		        // Warning: maxLength not taken into account in base64Write
		        return base64Write(this, string, offset, length)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return ucs2Write(this, string, offset, length)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		};

		Buffer.prototype.toJSON = function toJSON () {
		  return {
		    type: 'Buffer',
		    data: Array.prototype.slice.call(this._arr || this, 0)
		  }
		};

		function base64Slice (buf, start, end) {
		  if (start === 0 && end === buf.length) {
		    return base64.fromByteArray(buf)
		  } else {
		    return base64.fromByteArray(buf.slice(start, end))
		  }
		}

		function utf8Slice (buf, start, end) {
		  end = Math.min(buf.length, end);
		  var res = [];

		  var i = start;
		  while (i < end) {
		    var firstByte = buf[i];
		    var codePoint = null;
		    var bytesPerSequence = (firstByte > 0xEF)
		      ? 4
		      : (firstByte > 0xDF)
		          ? 3
		          : (firstByte > 0xBF)
		              ? 2
		              : 1;

		    if (i + bytesPerSequence <= end) {
		      var secondByte, thirdByte, fourthByte, tempCodePoint;

		      switch (bytesPerSequence) {
		        case 1:
		          if (firstByte < 0x80) {
		            codePoint = firstByte;
		          }
		          break
		        case 2:
		          secondByte = buf[i + 1];
		          if ((secondByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
		            if (tempCodePoint > 0x7F) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 3:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
		            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 4:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          fourthByte = buf[i + 3];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
		            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
		              codePoint = tempCodePoint;
		            }
		          }
		      }
		    }

		    if (codePoint === null) {
		      // we did not generate a valid codePoint so insert a
		      // replacement char (U+FFFD) and advance only 1 byte
		      codePoint = 0xFFFD;
		      bytesPerSequence = 1;
		    } else if (codePoint > 0xFFFF) {
		      // encode to utf16 (surrogate pair dance)
		      codePoint -= 0x10000;
		      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
		      codePoint = 0xDC00 | codePoint & 0x3FF;
		    }

		    res.push(codePoint);
		    i += bytesPerSequence;
		  }

		  return decodeCodePointsArray(res)
		}

		// Based on http://stackoverflow.com/a/22747272/680742, the browser with
		// the lowest limit is Chrome, with 0x10000 args.
		// We go 1 magnitude less, for safety
		var MAX_ARGUMENTS_LENGTH = 0x1000;

		function decodeCodePointsArray (codePoints) {
		  var len = codePoints.length;
		  if (len <= MAX_ARGUMENTS_LENGTH) {
		    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
		  }

		  // Decode in chunks to avoid "call stack size exceeded".
		  var res = '';
		  var i = 0;
		  while (i < len) {
		    res += String.fromCharCode.apply(
		      String,
		      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
		    );
		  }
		  return res
		}

		function asciiSlice (buf, start, end) {
		  var ret = '';
		  end = Math.min(buf.length, end);

		  for (var i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i] & 0x7F);
		  }
		  return ret
		}

		function latin1Slice (buf, start, end) {
		  var ret = '';
		  end = Math.min(buf.length, end);

		  for (var i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i]);
		  }
		  return ret
		}

		function hexSlice (buf, start, end) {
		  var len = buf.length;

		  if (!start || start < 0) start = 0;
		  if (!end || end < 0 || end > len) end = len;

		  var out = '';
		  for (var i = start; i < end; ++i) {
		    out += hexSliceLookupTable[buf[i]];
		  }
		  return out
		}

		function utf16leSlice (buf, start, end) {
		  var bytes = buf.slice(start, end);
		  var res = '';
		  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
		  for (var i = 0; i < bytes.length - 1; i += 2) {
		    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
		  }
		  return res
		}

		Buffer.prototype.slice = function slice (start, end) {
		  var len = this.length;
		  start = ~~start;
		  end = end === undefined ? len : ~~end;

		  if (start < 0) {
		    start += len;
		    if (start < 0) start = 0;
		  } else if (start > len) {
		    start = len;
		  }

		  if (end < 0) {
		    end += len;
		    if (end < 0) end = 0;
		  } else if (end > len) {
		    end = len;
		  }

		  if (end < start) end = start;

		  var newBuf = this.subarray(start, end);
		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(newBuf, Buffer.prototype);

		  return newBuf
		};

		/*
		 * Need to make sure that buffer isn't trying to write out of bounds.
		 */
		function checkOffset (offset, ext, length) {
		  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
		  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
		}

		Buffer.prototype.readUintLE =
		Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var val = this[offset];
		  var mul = 1;
		  var i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUintBE =
		Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    checkOffset(offset, byteLength, this.length);
		  }

		  var val = this[offset + --byteLength];
		  var mul = 1;
		  while (byteLength > 0 && (mul *= 0x100)) {
		    val += this[offset + --byteLength] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUint8 =
		Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  return this[offset]
		};

		Buffer.prototype.readUint16LE =
		Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return this[offset] | (this[offset + 1] << 8)
		};

		Buffer.prototype.readUint16BE =
		Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return (this[offset] << 8) | this[offset + 1]
		};

		Buffer.prototype.readUint32LE =
		Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return ((this[offset]) |
		      (this[offset + 1] << 8) |
		      (this[offset + 2] << 16)) +
		      (this[offset + 3] * 0x1000000)
		};

		Buffer.prototype.readUint32BE =
		Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] * 0x1000000) +
		    ((this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    this[offset + 3])
		};

		Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var val = this[offset];
		  var mul = 1;
		  var i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var i = byteLength;
		  var mul = 1;
		  var val = this[offset + --i];
		  while (i > 0 && (mul *= 0x100)) {
		    val += this[offset + --i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  if (!(this[offset] & 0x80)) return (this[offset])
		  return ((0xff - this[offset] + 1) * -1)
		};

		Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  var val = this[offset] | (this[offset + 1] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  var val = this[offset + 1] | (this[offset] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset]) |
		    (this[offset + 1] << 8) |
		    (this[offset + 2] << 16) |
		    (this[offset + 3] << 24)
		};

		Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] << 24) |
		    (this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    (this[offset + 3])
		};

		Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754$1.read(this, offset, true, 23, 4)
		};

		Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754$1.read(this, offset, false, 23, 4)
		};

		Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754$1.read(this, offset, true, 52, 8)
		};

		Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754$1.read(this, offset, false, 52, 8)
		};

		function checkInt (buf, value, offset, ext, max, min) {
		  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
		  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		}

		Buffer.prototype.writeUintLE =
		Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  var mul = 1;
		  var i = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUintBE =
		Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  var i = byteLength - 1;
		  var mul = 1;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUint8 =
		Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeUint16LE =
		Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeUint16BE =
		Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeUint32LE =
		Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset + 3] = (value >>> 24);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 1] = (value >>> 8);
		  this[offset] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeUint32BE =
		Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    var limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  var i = 0;
		  var mul = 1;
		  var sub = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    var limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  var i = byteLength - 1;
		  var mul = 1;
		  var sub = 0;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
		  if (value < 0) value = 0xff + value + 1;
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 3] = (value >>> 24);
		  return offset + 4
		};

		Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
		  if (value < 0) value = 0xffffffff + value + 1;
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		function checkIEEE754 (buf, value, offset, ext, max, min) {
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		  if (offset < 0) throw new RangeError('Index out of range')
		}

		function writeFloat (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 4);
		  }
		  ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
		  return offset + 4
		}

		Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, false, noAssert)
		};

		function writeDouble (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 8);
		  }
		  ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
		  return offset + 8
		}

		Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, false, noAssert)
		};

		// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
		Buffer.prototype.copy = function copy (target, targetStart, start, end) {
		  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
		  if (!start) start = 0;
		  if (!end && end !== 0) end = this.length;
		  if (targetStart >= target.length) targetStart = target.length;
		  if (!targetStart) targetStart = 0;
		  if (end > 0 && end < start) end = start;

		  // Copy 0 bytes; we're done
		  if (end === start) return 0
		  if (target.length === 0 || this.length === 0) return 0

		  // Fatal error conditions
		  if (targetStart < 0) {
		    throw new RangeError('targetStart out of bounds')
		  }
		  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
		  if (end < 0) throw new RangeError('sourceEnd out of bounds')

		  // Are we oob?
		  if (end > this.length) end = this.length;
		  if (target.length - targetStart < end - start) {
		    end = target.length - targetStart + start;
		  }

		  var len = end - start;

		  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
		    // Use built-in when available, missing from IE11
		    this.copyWithin(targetStart, start, end);
		  } else {
		    Uint8Array.prototype.set.call(
		      target,
		      this.subarray(start, end),
		      targetStart
		    );
		  }

		  return len
		};

		// Usage:
		//    buffer.fill(number[, offset[, end]])
		//    buffer.fill(buffer[, offset[, end]])
		//    buffer.fill(string[, offset[, end]][, encoding])
		Buffer.prototype.fill = function fill (val, start, end, encoding) {
		  // Handle string cases:
		  if (typeof val === 'string') {
		    if (typeof start === 'string') {
		      encoding = start;
		      start = 0;
		      end = this.length;
		    } else if (typeof end === 'string') {
		      encoding = end;
		      end = this.length;
		    }
		    if (encoding !== undefined && typeof encoding !== 'string') {
		      throw new TypeError('encoding must be a string')
		    }
		    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
		      throw new TypeError('Unknown encoding: ' + encoding)
		    }
		    if (val.length === 1) {
		      var code = val.charCodeAt(0);
		      if ((encoding === 'utf8' && code < 128) ||
		          encoding === 'latin1') {
		        // Fast path: If `val` fits into a single byte, use that numeric value.
		        val = code;
		      }
		    }
		  } else if (typeof val === 'number') {
		    val = val & 255;
		  } else if (typeof val === 'boolean') {
		    val = Number(val);
		  }

		  // Invalid ranges are not set to a default, so can range check early.
		  if (start < 0 || this.length < start || this.length < end) {
		    throw new RangeError('Out of range index')
		  }

		  if (end <= start) {
		    return this
		  }

		  start = start >>> 0;
		  end = end === undefined ? this.length : end >>> 0;

		  if (!val) val = 0;

		  var i;
		  if (typeof val === 'number') {
		    for (i = start; i < end; ++i) {
		      this[i] = val;
		    }
		  } else {
		    var bytes = Buffer.isBuffer(val)
		      ? val
		      : Buffer.from(val, encoding);
		    var len = bytes.length;
		    if (len === 0) {
		      throw new TypeError('The value "' + val +
		        '" is invalid for argument "value"')
		    }
		    for (i = 0; i < end - start; ++i) {
		      this[i + start] = bytes[i % len];
		    }
		  }

		  return this
		};

		// HELPER FUNCTIONS
		// ================

		var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

		function base64clean (str) {
		  // Node takes equal signs as end of the Base64 encoding
		  str = str.split('=')[0];
		  // Node strips out invalid characters like \n and \t from the string, base64-js does not
		  str = str.trim().replace(INVALID_BASE64_RE, '');
		  // Node converts strings with length < 2 to ''
		  if (str.length < 2) return ''
		  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
		  while (str.length % 4 !== 0) {
		    str = str + '=';
		  }
		  return str
		}

		function utf8ToBytes (string, units) {
		  units = units || Infinity;
		  var codePoint;
		  var length = string.length;
		  var leadSurrogate = null;
		  var bytes = [];

		  for (var i = 0; i < length; ++i) {
		    codePoint = string.charCodeAt(i);

		    // is surrogate component
		    if (codePoint > 0xD7FF && codePoint < 0xE000) {
		      // last char was a lead
		      if (!leadSurrogate) {
		        // no lead yet
		        if (codePoint > 0xDBFF) {
		          // unexpected trail
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        } else if (i + 1 === length) {
		          // unpaired lead
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        }

		        // valid lead
		        leadSurrogate = codePoint;

		        continue
		      }

		      // 2 leads in a row
		      if (codePoint < 0xDC00) {
		        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		        leadSurrogate = codePoint;
		        continue
		      }

		      // valid surrogate pair
		      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
		    } else if (leadSurrogate) {
		      // valid bmp char, but last char was a lead
		      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		    }

		    leadSurrogate = null;

		    // encode utf8
		    if (codePoint < 0x80) {
		      if ((units -= 1) < 0) break
		      bytes.push(codePoint);
		    } else if (codePoint < 0x800) {
		      if ((units -= 2) < 0) break
		      bytes.push(
		        codePoint >> 0x6 | 0xC0,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x10000) {
		      if ((units -= 3) < 0) break
		      bytes.push(
		        codePoint >> 0xC | 0xE0,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x110000) {
		      if ((units -= 4) < 0) break
		      bytes.push(
		        codePoint >> 0x12 | 0xF0,
		        codePoint >> 0xC & 0x3F | 0x80,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else {
		      throw new Error('Invalid code point')
		    }
		  }

		  return bytes
		}

		function asciiToBytes (str) {
		  var byteArray = [];
		  for (var i = 0; i < str.length; ++i) {
		    // Node's code seems to be doing this and not & 0x7F..
		    byteArray.push(str.charCodeAt(i) & 0xFF);
		  }
		  return byteArray
		}

		function utf16leToBytes (str, units) {
		  var c, hi, lo;
		  var byteArray = [];
		  for (var i = 0; i < str.length; ++i) {
		    if ((units -= 2) < 0) break

		    c = str.charCodeAt(i);
		    hi = c >> 8;
		    lo = c % 256;
		    byteArray.push(lo);
		    byteArray.push(hi);
		  }

		  return byteArray
		}

		function base64ToBytes (str) {
		  return base64.toByteArray(base64clean(str))
		}

		function blitBuffer (src, dst, offset, length) {
		  for (var i = 0; i < length; ++i) {
		    if ((i + offset >= dst.length) || (i >= src.length)) break
		    dst[i + offset] = src[i];
		  }
		  return i
		}

		// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
		// the `instanceof` check but they should be treated as of that type.
		// See: https://github.com/feross/buffer/issues/166
		function isInstance (obj, type) {
		  return obj instanceof type ||
		    (obj != null && obj.constructor != null && obj.constructor.name != null &&
		      obj.constructor.name === type.name)
		}
		function numberIsNaN (obj) {
		  // For IE11 support
		  return obj !== obj // eslint-disable-line no-self-compare
		}

		// Create lookup table for `toString('hex')`
		// See: https://github.com/feross/buffer/issues/219
		var hexSliceLookupTable = (function () {
		  var alphabet = '0123456789abcdef';
		  var table = new Array(256);
		  for (var i = 0; i < 16; ++i) {
		    var i16 = i * 16;
		    for (var j = 0; j < 16; ++j) {
		      table[i16 + j] = alphabet[i] + alphabet[j];
		    }
		  }
		  return table
		})();
	} (buffer));

	const byEbmlID = {
	    0x80: {
	        name: 'ChapterDisplay',
	        level: 4,
	        type: 'm',
	        multiple: true,
	        webm: true,
	        description: 'Contains all possible strings to use for the chapter display.',
	    },
	    0x83: {
	        name: 'TrackType',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        description: 'The `TrackType` defines the type of each frame found in the Track. The value **SHOULD** be stored on 1 octet.',
	    },
	    0x85: {
	        name: 'ChapString',
	        cppname: 'ChapterString',
	        level: 5,
	        type: '8',
	        mandatory: true,
	        webm: true,
	        description: 'Contains the string to use as the chapter atom.',
	    },
	    0x86: {
	        name: 'CodecID',
	        level: 3,
	        type: 's',
	        mandatory: true,
	        description: 'An ID corresponding to the codec, see [@!MatroskaCodec] for more info.',
	    },
	    0x88: {
	        name: 'FlagDefault',
	        cppname: 'TrackFlagDefault',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '1',
	        range: '0-1',
	        description: 'Set if that track (audio, video or subs) **SHOULD** be eligible for automatic selection by the player; see (#default-track-selection) for more details.',
	    },
	    0x89: {
	        name: 'ChapterTrackUID',
	        cppname: 'ChapterTrackNumber',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        multiple: true,
	        range: 'not 0',
	        description: 'UID of the Track to apply this chapter to. In the absence of a control track, choosing this chapter will select the listed Tracks and deselect unlisted tracks. Absence of this Element indicates that the Chapter **SHOULD** be applied to any currently used Tracks.',
	    },
	    0x8e: {
	        name: 'Slices',
	        level: 3,
	        type: 'm',
	        maxver: 1,
	        description: 'Contains slices description.',
	    },
	    0x8f: {
	        name: 'ChapterTrack',
	        level: 4,
	        type: 'm',
	        description: 'List of tracks on which the chapter applies. If this Element is not present, all tracks apply',
	    },
	    0x91: {
	        name: 'ChapterTimeStart',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        description: 'Timestamp of the start of Chapter, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks).',
	    },
	    0x92: {
	        name: 'ChapterTimeEnd',
	        level: 4,
	        type: 'u',
	        webm: true,
	        description: 'Timestamp of the end of Chapter timestamp excluded, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). The value **MUST** be greater than or equal to the `ChapterTimeStart` of the same `ChapterAtom`.',
	    },
	    0x96: {
	        name: 'CueRefTime',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 2,
	        description: 'Timestamp of the referenced Block, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks).',
	    },
	    0x97: {
	        name: 'CueRefCluster',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 0,
	        maxver: 0,
	        description: 'The Segment Position of the Cluster containing the referenced Block.',
	    },
	    0x98: {
	        name: 'ChapterFlagHidden',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        range: '0-1',
	        description: 'Set to 1 if a chapter is hidden. Hidden chapters **SHOULD NOT** be available to the user interface (but still to Control Tracks; see (#chapterflaghidden) on Chapter flags).',
	    },
	    0x9a: {
	        name: 'FlagInterlaced',
	        cppname: 'VideoFlagInterlaced',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 2,
	        webm: true,
	        'default': '0',
	        description: 'Specify whether the video frames in this track are interlaced or not.',
	    },
	    0x9b: {
	        name: 'BlockDuration',
	        level: 3,
	        type: 'u',
	        description: 'The duration of the Block, expressed in Track Ticks; see (#timestamp-ticks). The BlockDuration Element can be useful at the end of a Track to define the duration of the last frame (as there is no subsequent Block available), or when there is a break in a track like for subtitle tracks.',
	    },
	    0x9c: {
	        name: 'FlagLacing',
	        cppname: 'TrackFlagLacing',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '1',
	        range: '0-1',
	        description: 'Set to 1 if the track **MAY** contain blocks using lacing. When set to 0 all blocks **MUST** have their lacing flags set to No lacing; see (#block-lacing) on Block Lacing.',
	    },
	    0x9d: {
	        name: 'FieldOrder',
	        cppname: 'VideoFieldOrder',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        'default': '2',
	        description: 'Specify the field ordering of video frames in this track.',
	    },
	    0x9f: {
	        name: 'Channels',
	        cppname: 'AudioChannels',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '1',
	        range: 'not 0',
	        description: 'Numbers of channels in the track.',
	    },
	    0xa0: {
	        name: 'BlockGroup',
	        level: 2,
	        type: 'm',
	        multiple: true,
	        description: 'Basic container of information containing a single Block and information specific to that Block.',
	    },
	    0xa1: {
	        name: 'Block',
	        level: 3,
	        type: 'b',
	        mandatory: true,
	        description: 'Block containing the actual data to be rendered and a timestamp relative to the Cluster Timestamp; see (#block-structure) on Block Structure.',
	    },
	    0xa2: {
	        name: 'BlockVirtual',
	        level: 3,
	        type: 'b',
	        minver: 0,
	        maxver: 0,
	        description: 'A Block with no data. It **MUST** be stored in the stream at the place the real Block would be in display order. ',
	    },
	    0xa3: {
	        name: 'SimpleBlock',
	        level: 2,
	        type: 'b',
	        multiple: true,
	        minver: 2,
	        webm: true,
	        divx: true,
	        description: 'Similar to Block, see (#block-structure), but without all the extra information, mostly used to reduced overhead when no extra feature is needed; see (#simpleblock-structure) on SimpleBlock Structure.',
	    },
	    0xa4: {
	        name: 'CodecState',
	        level: 3,
	        type: 'b',
	        minver: 2,
	        description: 'The new codec state to use. Data interpretation is private to the codec. This information **SHOULD** always be referenced by a seek entry.',
	    },
	    0xa5: {
	        name: 'BlockAdditional',
	        level: 5,
	        type: 'b',
	        mandatory: true,
	        webm: true,
	        description: 'Interpreted by the codec as it wishes (using the BlockAddID).',
	    },
	    0xa6: {
	        name: 'BlockMore',
	        level: 4,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'Contain the BlockAdditional and some parameters.',
	    },
	    0xa7: {
	        name: 'Position',
	        cppname: 'ClusterPosition',
	        level: 2,
	        type: 'u',
	        description: 'The Segment Position of the Cluster in the Segment (0 in live streams). It might help to resynchronise offset on damaged streams.',
	    },
	    0xaa: {
	        name: 'CodecDecodeAll',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        maxver: 0,
	        'default': '1',
	        range: '0-1',
	        description: 'Set to 1 if the codec can decode potentially damaged data.',
	    },
	    0xab: {
	        name: 'PrevSize',
	        cppname: 'ClusterPrevSize',
	        level: 2,
	        type: 'u',
	        description: 'Size of the previous Cluster, in octets. Can be useful for backward playing.',
	    },
	    0xae: {
	        name: 'TrackEntry',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        description: 'Describes a track with all Elements.',
	    },
	    0xaf: {
	        name: 'EncryptedBlock',
	        level: 2,
	        type: 'b',
	        multiple: true,
	        minver: 0,
	        maxver: 0,
	        description: 'Similar to SimpleBlock, see (#simpleblock-structure), but the data inside the Block are Transformed (encrypt and/or signed).',
	    },
	    0xb0: {
	        name: 'PixelWidth',
	        cppname: 'VideoPixelWidth',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'Width of the encoded video frames in pixels.',
	    },
	    0xb2: {
	        name: 'CueDuration',
	        level: 4,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The duration of the block, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks). If missing, the track\'s DefaultDuration does not apply and no duration information is available in terms of the cues.',
	    },
	    0xb3: {
	        name: 'CueTime',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        description: 'Absolute timestamp of the seek point, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks).',
	    },
	    0xb5: {
	        name: 'SamplingFrequency',
	        cppname: 'AudioSamplingFreq',
	        level: 4,
	        type: 'f',
	        mandatory: true,
	        'default': '0x1.f4p+12',
	        range: '> 0x0p+0',
	        description: 'Sampling frequency in Hz.',
	    },
	    0xb6: {
	        name: 'ChapterAtom',
	        level: 3,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'Contains the atom information to use as the chapter atom (apply to all tracks).',
	    },
	    0xb7: {
	        name: 'CueTrackPositions',
	        level: 3,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        description: 'Contain positions for different tracks corresponding to the timestamp.',
	    },
	    0xb9: {
	        name: 'FlagEnabled',
	        cppname: 'TrackFlagEnabled',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        minver: 2,
	        webm: true,
	        'default': '1',
	        range: '0-1',
	        description: 'Set to 1 if the track is usable. It is possible to turn a not usable track into a usable track using chapter codecs or control tracks.',
	    },
	    0xba: {
	        name: 'PixelHeight',
	        cppname: 'VideoPixelHeight',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'Height of the encoded video frames in pixels.',
	    },
	    0xbb: {
	        name: 'CuePoint',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        description: 'Contains all information relative to a seek point in the Segment.',
	    },
	    0xbf: {
	        name: 'CRC-32',
	        level: -1,
	        type: 'b',
	        minver: 1,
	        webm: false,
	        description: 'The CRC is computed on all the data of the Master element it\'s in. The CRC element should be the first in it\'s parent master for easier reading. All level 1 elements should include a CRC-32. The CRC in use is the IEEE CRC32 Little Endian',
	        crc: true,
	    },
	    0xc0: {
	        name: 'TrickTrackUID',
	        level: 3,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The TrackUID of the Smooth FF/RW video in the paired EBML structure corresponding to this video track. See [@?DivXTrickTrack].',
	    },
	    0xc1: {
	        name: 'TrickTrackSegmentUID',
	        level: 3,
	        type: 'b',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The SegmentUID of the Segment containing the track identified by TrickTrackUID. See [@?DivXTrickTrack].',
	    },
	    0xc4: {
	        name: 'TrickMasterTrackSegmentUID',
	        level: 3,
	        type: 'b',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The SegmentUID of the Segment containing the track identified by MasterTrackUID. See [@?DivXTrickTrack].',
	    },
	    0xc6: {
	        name: 'TrickTrackFlag',
	        level: 3,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        'default': '0',
	        description: 'Set to 1 if this video track is a Smooth FF/RW track. If set to 1, MasterTrackUID and MasterTrackSegUID should must be present and BlockGroups for this track must contain ReferenceFrame structures. Otherwise, TrickTrackUID and TrickTrackSegUID must be present if this track has a corresponding Smooth FF/RW track. See [@?DivXTrickTrack].',
	    },
	    0xc7: {
	        name: 'TrickMasterTrackUID',
	        level: 3,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The TrackUID of the video track in the paired EBML structure that corresponds to this Smooth FF/RW track. See [@?DivXTrickTrack].',
	    },
	    0xc8: {
	        name: 'ReferenceFrame',
	        level: 3,
	        type: 'm',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'Contains information about the last reference frame. See [@?DivXTrickTrack].',
	    },
	    0xc9: {
	        name: 'ReferenceOffset',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The relative offset, in bytes, from the previous BlockGroup element for this Smooth FF/RW video track to the containing BlockGroup element. See [@?DivXTrickTrack].',
	    },
	    0xca: {
	        name: 'ReferenceTimestamp',
	        cppname: 'ReferenceTimeCode',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The timestamp of the BlockGroup pointed to by ReferenceOffset, expressed in Track Ticks; see (#timestamp-ticks). See [@?DivXTrickTrack].',
	    },
	    0xcb: {
	        name: 'BlockAdditionID',
	        cppname: 'SliceBlockAddID',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'The ID of the BlockAdditional Element (0 is the main Block).',
	    },
	    0xcc: {
	        name: 'LaceNumber',
	        cppname: 'SliceLaceNumber',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        description: 'The reverse number of the frame in the lace (0 is the last frame, 1 is the next to last, etc). Being able to interpret this Element is not **REQUIRED** for playback.',
	    },
	    0xcd: {
	        name: 'FrameNumber',
	        cppname: 'SliceFrameNumber',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'The number of the frame to generate from this lace with this delay (allow you to generate many frames from the same Block/Frame).',
	    },
	    0xce: {
	        name: 'Delay',
	        cppname: 'SliceDelay',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'The delay to apply to the Element, expressed in Track Ticks; see (#timestamp-ticks).',
	    },
	    0xcf: {
	        name: 'SliceDuration',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'The duration to apply to the Element, expressed in Track Ticks; see (#timestamp-ticks).',
	    },
	    0xd7: {
	        name: 'TrackNumber',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'The track number as used in the Block Header (using more than 127 tracks is not encouraged, though the design allows an unlimited number).',
	    },
	    0xdb: {
	        name: 'CueReference',
	        level: 4,
	        type: 'm',
	        multiple: true,
	        minver: 2,
	        description: 'The Clusters containing the referenced Blocks.',
	    },
	    0xe0: {
	        name: 'Video',
	        cppname: 'TrackVideo',
	        level: 3,
	        type: 'm',
	        description: 'Video settings.',
	    },
	    0xe1: {
	        name: 'Audio',
	        cppname: 'TrackAudio',
	        level: 3,
	        type: 'm',
	        description: 'Audio settings.',
	    },
	    0xe2: {
	        name: 'TrackOperation',
	        level: 3,
	        type: 'm',
	        minver: 3,
	        description: 'Operation that needs to be applied on tracks to create this virtual track. For more details look at (#track-operation).',
	    },
	    0xe3: {
	        name: 'TrackCombinePlanes',
	        level: 4,
	        type: 'm',
	        minver: 3,
	        description: 'Contains the list of all video plane tracks that need to be combined to create this 3D track',
	    },
	    0xe4: {
	        name: 'TrackPlane',
	        level: 5,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        minver: 3,
	        description: 'Contains a video plane track that need to be combined to create this 3D track',
	    },
	    0xe5: {
	        name: 'TrackPlaneUID',
	        level: 6,
	        type: 'u',
	        mandatory: true,
	        minver: 3,
	        range: 'not 0',
	        description: 'The trackUID number of the track representing the plane.',
	    },
	    0xe6: {
	        name: 'TrackPlaneType',
	        level: 6,
	        type: 'u',
	        mandatory: true,
	        minver: 3,
	        description: 'The kind of plane this track corresponds to.',
	    },
	    0xe7: {
	        name: 'Timestamp',
	        cppname: 'ClusterTimecode',
	        level: 2,
	        type: 'u',
	        mandatory: true,
	        description: 'Absolute timestamp of the cluster, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks).',
	    },
	    0xe8: {
	        name: 'TimeSlice',
	        level: 4,
	        type: 'm',
	        multiple: true,
	        minver: 0,
	        maxver: 0,
	        description: 'Contains extra time information about the data contained in the Block. Being able to interpret this Element is not **REQUIRED** for playback.',
	    },
	    0xe9: {
	        name: 'TrackJoinBlocks',
	        level: 4,
	        type: 'm',
	        minver: 3,
	        description: 'Contains the list of all tracks whose Blocks need to be combined to create this virtual track',
	    },
	    0xea: {
	        name: 'CueCodecState',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 2,
	        'default': '0',
	        description: 'The Segment Position of the Codec State corresponding to this Cue Element. 0 means that the data is taken from the initial Track Entry.',
	    },
	    0xeb: {
	        name: 'CueRefCodecState',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'The Segment Position of the Codec State corresponding to this referenced Element. 0 means that the data is taken from the initial Track Entry.',
	    },
	    0xec: {
	        name: 'Void',
	        level: -1,
	        type: 'b',
	        minver: 1,
	        description: 'Used to void damaged data, to avoid unexpected behaviors when using damaged data. The content is discarded. Also used to reserve space in a sub-element for later use.',
	    },
	    0xed: {
	        name: 'TrackJoinUID',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        multiple: true,
	        minver: 3,
	        range: 'not 0',
	        description: 'The trackUID number of a track whose blocks are used to create this virtual track.',
	    },
	    0xee: {
	        name: 'BlockAddID',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '1',
	        range: 'not 0',
	        description: 'An ID to identify the BlockAdditional level. If BlockAddIDType of the corresponding block is 0, this value is also the value of BlockAddIDType for the meaning of the content of BlockAdditional.',
	    },
	    0xf0: {
	        name: 'CueRelativePosition',
	        level: 4,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The relative position inside the Cluster of the referenced SimpleBlock or BlockGroup with 0 being the first possible position for an Element inside that Cluster.',
	    },
	    0xf1: {
	        name: 'CueClusterPosition',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        description: 'The Segment Position of the Cluster containing the associated Block.',
	    },
	    0xf7: {
	        name: 'CueTrack',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'The track for which a position is given.',
	    },
	    0xfa: {
	        name: 'ReferencePriority',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'This frame is referenced and has the specified cache priority. In cache only a frame of the same or higher priority can replace this frame. A value of 0 means the frame is not referenced.',
	    },
	    0xfb: {
	        name: 'ReferenceBlock',
	        level: 3,
	        type: 'i',
	        multiple: true,
	        description: 'A timestamp value, relative to the timestamp of the Block in this BlockGroup, expressed in Track Ticks; see (#timestamp-ticks). This is used to reference other frames necessary to decode this frame. The relative value **SHOULD** correspond to a valid `Block` this `Block` depends on. Historically Matroska Writer didn\'t write the actual `Block(s)` this `Block` depends on, but *some* `Block` in the past.  The value "0" **MAY** also be used to signify this `Block` cannot be decoded on its own, but without knownledge of which `Block` is necessary. In this case, other `ReferenceBlock` **MUST NOT** be found in the same `BlockGroup`.  If the `BlockGroup` doesn\'t have any `ReferenceBlock` element, then the `Block` it contains can be decoded without using any other `Block` data.',
	    },
	    0xfd: {
	        name: 'ReferenceVirtual',
	        level: 3,
	        type: 'i',
	        minver: 0,
	        maxver: 0,
	        description: 'The Segment Position of the data that would otherwise be in position of the virtual block.',
	    },
	    0x41a4: {
	        name: 'BlockAddIDName',
	        level: 4,
	        type: 's',
	        minver: 4,
	        description: 'A human-friendly name describing the type of BlockAdditional data, as defined by the associated Block Additional Mapping.',
	    },
	    0x41e4: {
	        name: 'BlockAdditionMapping',
	        level: 3,
	        type: 'm',
	        multiple: true,
	        minver: 4,
	        description: 'Contains elements that extend the track format, by adding content either to each frame, with BlockAddID ((#blockaddid-element)), or to the track as a whole with BlockAddIDExtraData.',
	    },
	    0x41e7: {
	        name: 'BlockAddIDType',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        'default': '0',
	        description: 'Stores the registered identifier of the Block Additional Mapping to define how the BlockAdditional data should be handled.',
	    },
	    0x41ed: {
	        name: 'BlockAddIDExtraData',
	        level: 4,
	        type: 'b',
	        minver: 4,
	        description: 'Extra binary data that the BlockAddIDType can use to interpret the BlockAdditional data. The interpretation of the binary data depends on the BlockAddIDType value and the corresponding Block Additional Mapping.',
	    },
	    0x41f0: {
	        name: 'BlockAddIDValue',
	        level: 4,
	        type: 'u',
	        minver: 4,
	        range: '>=2',
	        description: 'If the track format extension needs content beside frames, the value refers to the BlockAddID ((#blockaddid-element)), value being described. To keep MaxBlockAdditionID as low as possible, small values **SHOULD** be used.',
	    },
	    0x4254: {
	        name: 'ContentCompAlgo',
	        level: 6,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The compression algorithm used.',
	    },
	    0x4255: {
	        name: 'ContentCompSettings',
	        level: 6,
	        type: 'b',
	        description: 'Settings that might be needed by the decompressor. For Header Stripping (`ContentCompAlgo`=3), the bytes that were removed from the beginning of each frames of the track.',
	    },
	    0x4282: {
	        name: 'DocType',
	        level: 1,
	        type: 's',
	        mandatory: true,
	        'default': 'matroska',
	        minver: 1,
	        description: 'A string that describes the type of document that follows this EBML header. \'matroska\' in our case or \'webm\' for webm files.',
	    },
	    0x4285: {
	        name: 'DocTypeReadVersion',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': 1,
	        minver: 1,
	        description: 'The minimum DocType version an interpreter has to support to read this file.',
	    },
	    0x4286: {
	        name: 'EBMLVersion',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': 1,
	        minver: 1,
	        description: 'The version of EBML parser used to create the file.',
	    },
	    0x4287: {
	        name: 'DocTypeVersion',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': 1,
	        minver: 1,
	        description: 'The version of DocType interpreter used to create the file.',
	    },
	    0x42f2: {
	        name: 'EBMLMaxIDLength',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': '4',
	        range: '4',
	    },
	    0x42f3: {
	        name: 'EBMLMaxSizeLength',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': '8',
	        range: '1-8',
	    },
	    0x42f7: {
	        name: 'EBMLReadVersion',
	        level: 1,
	        type: 'u',
	        mandatory: true,
	        'default': 1,
	        minver: 1,
	        description: 'The minimum EBML version a parser has to support to read this file.',
	    },
	    0x437c: {
	        name: 'ChapLanguage',
	        cppname: 'ChapterLanguage',
	        level: 5,
	        type: 's',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        'default': 'eng',
	        description: 'A language corresponding to the string, in the bibliographic ISO-639-2 form [@!ISO639-2]. This Element **MUST** be ignored if a ChapLanguageIETF Element is used within the same ChapterDisplay Element.',
	    },
	    0x437d: {
	        name: 'ChapLanguageIETF',
	        level: 5,
	        type: 's',
	        multiple: true,
	        minver: 4,
	        description: 'Specifies a language corresponding to the ChapString in the format defined in [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If a ChapLanguageIETF Element is used, then any ChapLanguage and ChapCountry Elements used in the same ChapterDisplay **MUST** be ignored.',
	    },
	    0x437e: {
	        name: 'ChapCountry',
	        cppname: 'ChapterCountry',
	        level: 5,
	        type: 's',
	        multiple: true,
	        webm: true,
	        description: 'A country corresponding to the string, using the same 2 octets country-codes as in Internet domains [@!IANADomains] based on [@!ISO3166-1] alpha-2 codes. This Element **MUST** be ignored if a ChapLanguageIETF Element is used within the same ChapterDisplay Element.',
	    },
	    0x4444: {
	        name: 'SegmentFamily',
	        level: 2,
	        type: 'b',
	        multiple: true,
	        description: 'A randomly generated unique ID that all Segments of a Linked Segment **MUST** share (128 bits).',
	    },
	    0x4461: {
	        name: 'DateUTC',
	        level: 2,
	        type: 'd',
	        description: 'The date and time that the Segment was created by the muxing application or library.',
	    },
	    0x447a: {
	        name: 'TagLanguage',
	        cppname: 'TagLangue',
	        level: 4,
	        type: 's',
	        mandatory: true,
	        webm: true,
	        'default': 'und',
	        description: 'Specifies the language of the tag specified, in the Matroska languages form; see (#language-codes) on language codes. This Element **MUST** be ignored if the TagLanguageIETF Element is used within the same SimpleTag Element.',
	    },
	    0x447b: {
	        name: 'TagLanguageIETF',
	        level: 4,
	        type: 's',
	        minver: 4,
	        description: 'Specifies the language used in the TagString according to [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If this Element is used, then any TagLanguage Elements used in the same SimpleTag **MUST** be ignored.',
	    },
	    0x4484: {
	        name: 'TagDefault',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '1',
	        range: '0-1',
	        description: 'A boolean value to indicate if this is the default/original language to use for the given tag.',
	    },
	    0x4485: {
	        name: 'TagBinary',
	        level: 4,
	        type: 'b',
	        webm: true,
	        description: 'The values of the Tag, if it is binary. Note that this cannot be used in the same SimpleTag as TagString.',
	    },
	    0x4487: {
	        name: 'TagString',
	        level: 4,
	        type: '8',
	        webm: true,
	        description: 'The value of the Tag.',
	    },
	    0x4489: {
	        name: 'Duration',
	        level: 2,
	        type: 'f',
	        range: '> 0x0p+0',
	        description: 'Duration of the Segment, expressed in Segment Ticks which is based on TimestampScale; see (#timestamp-ticks).',
	    },
	    0x44b4: {
	        name: 'TagDefaultBogus',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 0,
	        maxver: 0,
	        'default': '1',
	        range: '0-1',
	        description: 'A variant of the TagDefault element with a bogus Element ID; see (#tagdefault-element).',
	    },
	    0x450d: {
	        name: 'ChapProcessPrivate',
	        cppname: 'ChapterProcessPrivate',
	        level: 5,
	        type: 'b',
	        description: 'Some optional data attached to the ChapProcessCodecID information. For ChapProcessCodecID = 1, it is the "DVD level" equivalent; see (#menu-features) on DVD menus.',
	    },
	    0x4598: {
	        name: 'ChapterFlagEnabled',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '1',
	        range: '0-1',
	        description: 'Set to 1 if the chapter is enabled. It can be enabled/disabled by a Control Track. When disabled, the movie **SHOULD** skip all the content between the TimeStart and TimeEnd of this chapter; see (#chapter-flags) on Chapter flags.',
	    },
	    0x45a3: {
	        name: 'TagName',
	        level: 4,
	        type: '8',
	        mandatory: true,
	        webm: true,
	        description: 'The name of the Tag that is going to be stored.',
	    },
	    0x45b9: {
	        name: 'EditionEntry',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'Contains all information about a Segment edition.',
	    },
	    0x45bc: {
	        name: 'EditionUID',
	        level: 3,
	        type: 'u',
	        range: 'not 0',
	        description: 'A unique ID to identify the edition. It\'s useful for tagging an edition.',
	    },
	    0x45bd: {
	        name: 'EditionFlagHidden',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        range: '0-1',
	        description: 'Set to 1 if an edition is hidden. Hidden editions **SHOULD NOT** be available to the user interface (but still to Control Tracks; see (#chapter-flags) on Chapter flags).',
	    },
	    0x45db: {
	        name: 'EditionFlagDefault',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        range: '0-1',
	        description: 'Set to 1 if the edition **SHOULD** be used as the default one.',
	    },
	    0x45dd: {
	        name: 'EditionFlagOrdered',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        range: '0-1',
	        description: 'Set to 1 if the chapters can be defined multiple times and the order to play them is enforced; see (#editionflagordered).',
	    },
	    0x465c: {
	        name: 'FileData',
	        level: 3,
	        type: 'b',
	        mandatory: true,
	        description: 'The data of the file.',
	    },
	    0x4660: {
	        name: 'FileMimeType',
	        cppname: 'MimeType',
	        level: 3,
	        type: 's',
	        mandatory: true,
	        description: 'MIME type of the file.',
	    },
	    0x4661: {
	        name: 'FileUsedStartTime',
	        level: 3,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The timestamp at which this optimized font attachment comes into context, expressed in Segment Ticks which is based on TimestampScale. See [@?DivXWorldFonts].',
	    },
	    0x4662: {
	        name: 'FileUsedEndTime',
	        level: 3,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        divx: true,
	        description: 'The timestamp at which this optimized font attachment goes out of context, expressed in Segment Ticks which is based on TimestampScale. See [@?DivXWorldFonts].',
	    },
	    0x466e: {
	        name: 'FileName',
	        level: 3,
	        type: '8',
	        mandatory: true,
	        description: 'Filename of the attached file.',
	    },
	    0x4675: {
	        name: 'FileReferral',
	        level: 3,
	        type: 'b',
	        minver: 0,
	        maxver: 0,
	        description: 'A binary value that a track/codec can refer to when the attachment is needed.',
	    },
	    0x467e: {
	        name: 'FileDescription',
	        level: 3,
	        type: '8',
	        description: 'A human-friendly name for the attached file.',
	    },
	    0x46ae: {
	        name: 'FileUID',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'Unique ID representing the file, as random as possible.',
	    },
	    0x47e1: {
	        name: 'ContentEncAlgo',
	        level: 6,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '0',
	        description: 'The encryption algorithm used. The value "0" means that the contents have not been encrypted.',
	    },
	    0x47e2: {
	        name: 'ContentEncKeyID',
	        level: 6,
	        type: 'b',
	        webm: true,
	        description: 'For public key algorithms this is the ID of the public key the the data was encrypted with.',
	    },
	    0x47e3: {
	        name: 'ContentSignature',
	        level: 6,
	        type: 'b',
	        maxver: 0,
	        description: 'A cryptographic signature of the contents.',
	    },
	    0x47e4: {
	        name: 'ContentSigKeyID',
	        level: 6,
	        type: 'b',
	        maxver: 0,
	        description: 'This is the ID of the private key the data was signed with.',
	    },
	    0x47e5: {
	        name: 'ContentSigAlgo',
	        level: 6,
	        type: 'u',
	        maxver: 0,
	        'default': '0',
	        description: 'The algorithm used for the signature.',
	    },
	    0x47e6: {
	        name: 'ContentSigHashAlgo',
	        level: 6,
	        type: 'u',
	        maxver: 0,
	        'default': '0',
	        description: 'The hash algorithm used for the signature.',
	    },
	    0x47e7: {
	        name: 'ContentEncAESSettings',
	        level: 6,
	        type: 'm',
	        minver: 4,
	        webm: true,
	        description: 'Settings describing the encryption algorithm used. If `ContentEncAlgo` != 5 this **MUST** be ignored.',
	    },
	    0x47e8: {
	        name: 'AESSettingsCipherMode',
	        level: 7,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        description: 'The AES cipher mode used in the encryption.',
	    },
	    0x4d80: {
	        name: 'MuxingApp',
	        level: 2,
	        type: '8',
	        mandatory: true,
	        description: 'Muxing application or library (example: "libmatroska-0.4.3").',
	    },
	    0x4dbb: {
	        name: 'Seek',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        description: 'Contains a single seek entry to an EBML Element.',
	    },
	    0x5031: {
	        name: 'ContentEncodingOrder',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '0',
	        description: 'Tells when this modification was used during encoding/muxing starting with 0 and counting upwards. The decoder/demuxer has to start with the highest order number it finds and work its way down. This value has to be unique over all ContentEncodingOrder Elements in the TrackEntry that contains this ContentEncodingOrder element.',
	    },
	    0x5032: {
	        name: 'ContentEncodingScope',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '1',
	        description: 'A bit field that describes which Elements have been modified in this way. Values (big-endian) can be OR\'ed.',
	    },
	    0x5033: {
	        name: 'ContentEncodingType',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '0',
	        description: 'A value describing what kind of transformation is applied.',
	    },
	    0x5034: {
	        name: 'ContentCompression',
	        level: 5,
	        type: 'm',
	        description: 'Settings describing the compression used. This Element **MUST** be present if the value of ContentEncodingType is 0 and absent otherwise. Each block **MUST** be decompressable even if no previous block is available in order not to prevent seeking.',
	    },
	    0x5035: {
	        name: 'ContentEncryption',
	        level: 5,
	        type: 'm',
	        webm: true,
	        description: 'Settings describing the encryption used. This Element **MUST** be present if the value of `ContentEncodingType` is 1 (encryption) and **MUST** be ignored otherwise.',
	    },
	    0x535f: {
	        name: 'CueRefNumber',
	        level: 5,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '1',
	        range: 'not 0',
	        description: 'Number of the referenced Block of Track X in the specified Cluster.',
	    },
	    0x536e: {
	        name: 'Name',
	        cppname: 'TrackName',
	        level: 3,
	        type: '8',
	        description: 'A human-readable track name.',
	    },
	    0x5378: {
	        name: 'CueBlockNumber',
	        level: 4,
	        type: 'u',
	        range: 'not 0',
	        description: 'Number of the Block in the specified Cluster.',
	    },
	    0x537f: {
	        name: 'TrackOffset',
	        level: 3,
	        type: 'i',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'A value to add to the Block\'s Timestamp, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). This can be used to adjust the playback offset of a track.',
	    },
	    0x53ab: {
	        name: 'SeekID',
	        level: 3,
	        type: 'b',
	        mandatory: true,
	        description: 'The binary ID corresponding to the Element name.',
	    },
	    0x53ac: {
	        name: 'SeekPosition',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        description: 'The Segment Position of the Element.',
	    },
	    0x53b8: {
	        name: 'StereoMode',
	        cppname: 'VideoStereoMode',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 3,
	        webm: true,
	        'default': '0',
	        description: 'Stereo-3D video mode. There are some more details in (#multi-planar-and-3d-videos).',
	    },
	    0x53b9: {
	        name: 'OldStereoMode',
	        level: 4,
	        type: 'u',
	        maxver: 0,
	        description: 'DEPRECATED, DO NOT USE. Bogus StereoMode value used in old versions of libmatroska.',
	    },
	    0x53c0: {
	        name: 'AlphaMode',
	        cppname: 'VideoAlphaMode',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        minver: 3,
	        webm: true,
	        'default': '0',
	        description: 'Indicate whether the BlockAdditional Element with BlockAddID of "1" contains Alpha data, as defined by to the Codec Mapping for the `CodecID`. Undefined values **SHOULD NOT** be used as the behavior of known implementations is different (considered either as 0 or 1).',
	    },
	    0x54aa: {
	        name: 'PixelCropBottom',
	        cppname: 'VideoPixelCropBottom',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The number of video pixels to remove at the bottom of the image.',
	    },
	    0x54b0: {
	        name: 'DisplayWidth',
	        cppname: 'VideoDisplayWidth',
	        level: 4,
	        type: 'u',
	        range: 'not 0',
	        description: 'Width of the video frames to display. Applies to the video frame after cropping (PixelCrop* Elements).',
	    },
	    0x54b2: {
	        name: 'DisplayUnit',
	        cppname: 'VideoDisplayUnit',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'How DisplayWidth & DisplayHeight are interpreted.',
	    },
	    0x54b3: {
	        name: 'AspectRatioType',
	        cppname: 'VideoAspectRatio',
	        level: 4,
	        type: 'u',
	        minver: 0,
	        maxver: 0,
	        'default': '0',
	        description: 'Specify the possible modifications to the aspect ratio.',
	    },
	    0x54ba: {
	        name: 'DisplayHeight',
	        cppname: 'VideoDisplayHeight',
	        level: 4,
	        type: 'u',
	        range: 'not 0',
	        description: 'Height of the video frames to display. Applies to the video frame after cropping (PixelCrop* Elements).',
	    },
	    0x54bb: {
	        name: 'PixelCropTop',
	        cppname: 'VideoPixelCropTop',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The number of video pixels to remove at the top of the image.',
	    },
	    0x54cc: {
	        name: 'PixelCropLeft',
	        cppname: 'VideoPixelCropLeft',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The number of video pixels to remove on the left of the image.',
	    },
	    0x54dd: {
	        name: 'PixelCropRight',
	        cppname: 'VideoPixelCropRight',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The number of video pixels to remove on the right of the image.',
	    },
	    0x55aa: {
	        name: 'FlagForced',
	        cppname: 'TrackFlagForced',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        range: '0-1',
	        description: 'Applies only to subtitles. Set if that track **SHOULD** be eligible for automatic selection by the player if it matches the user\'s language preference, even if the user\'s preferences would normally not enable subtitles with the selected audio track; this can be used for tracks containing only translations of foreign-language audio or onscreen text. See (#default-track-selection) for more details.',
	    },
	    0x55ab: {
	        name: 'FlagHearingImpaired',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: '0-1',
	        description: 'Set to 1 if that track is suitable for users with hearing impairments, set to 0 if it is unsuitable for users with hearing impairments.',
	    },
	    0x55ac: {
	        name: 'FlagVisualImpaired',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: '0-1',
	        description: 'Set to 1 if that track is suitable for users with visual impairments, set to 0 if it is unsuitable for users with visual impairments.',
	    },
	    0x55ad: {
	        name: 'FlagTextDescriptions',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: '0-1',
	        description: 'Set to 1 if that track contains textual descriptions of video content, set to 0 if that track does not contain textual descriptions of video content.',
	    },
	    0x55ae: {
	        name: 'FlagOriginal',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: '0-1',
	        description: 'Set to 1 if that track is in the content\'s original language, set to 0 if it is a translation.',
	    },
	    0x55af: {
	        name: 'FlagCommentary',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: '0-1',
	        description: 'Set to 1 if that track contains commentary, set to 0 if it does not contain commentary.',
	    },
	    0x55b0: {
	        name: 'Colour',
	        cppname: 'VideoColour',
	        level: 4,
	        type: 'm',
	        minver: 4,
	        webm: true,
	        description: 'Settings describing the colour format.',
	    },
	    0x55b1: {
	        name: 'MatrixCoefficients',
	        cppname: 'VideoColourMatrix',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '2',
	        description: 'The Matrix Coefficients of the video used to derive luma and chroma values from red, green, and blue color primaries. For clarity, the value and meanings for MatrixCoefficients are adopted from Table 4 of ISO/IEC 23001-8:2016 or ITU-T H.273.',
	    },
	    0x55b2: {
	        name: 'BitsPerChannel',
	        cppname: 'VideoBitsPerChannel',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'Number of decoded bits per channel. A value of 0 indicates that the BitsPerChannel is unspecified.',
	    },
	    0x55b3: {
	        name: 'ChromaSubsamplingHorz',
	        cppname: 'VideoChromaSubsampHorz',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The amount of pixels to remove in the Cr and Cb channels for every pixel not removed horizontally. Example: For video with 4:2:0 chroma subsampling, the ChromaSubsamplingHorz **SHOULD** be set to 1.',
	    },
	    0x55b4: {
	        name: 'ChromaSubsamplingVert',
	        cppname: 'VideoChromaSubsampVert',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The amount of pixels to remove in the Cr and Cb channels for every pixel not removed vertically. Example: For video with 4:2:0 chroma subsampling, the ChromaSubsamplingVert **SHOULD** be set to 1.',
	    },
	    0x55b5: {
	        name: 'CbSubsamplingHorz',
	        cppname: 'VideoCbSubsampHorz',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The amount of pixels to remove in the Cb channel for every pixel not removed horizontally. This is additive with ChromaSubsamplingHorz. Example: For video with 4:2:1 chroma subsampling, the ChromaSubsamplingHorz **SHOULD** be set to 1 and CbSubsamplingHorz **SHOULD** be set to 1.',
	    },
	    0x55b6: {
	        name: 'CbSubsamplingVert',
	        cppname: 'VideoCbSubsampVert',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'The amount of pixels to remove in the Cb channel for every pixel not removed vertically. This is additive with ChromaSubsamplingVert.',
	    },
	    0x55b7: {
	        name: 'ChromaSitingHorz',
	        cppname: 'VideoChromaSitHorz',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'How chroma is subsampled horizontally.',
	    },
	    0x55b8: {
	        name: 'ChromaSitingVert',
	        cppname: 'VideoChromaSitVert',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'How chroma is subsampled vertically.',
	    },
	    0x55b9: {
	        name: 'Range',
	        cppname: 'VideoColourRange',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'Clipping of the color ranges.',
	    },
	    0x55ba: {
	        name: 'TransferCharacteristics',
	        cppname: 'VideoColourTransferCharacter',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '2',
	        description: 'The transfer characteristics of the video. For clarity, the value and meanings for TransferCharacteristics are adopted from Table 3 of ISO/IEC 23091-4 or ITU-T H.273.',
	    },
	    0x55bb: {
	        name: 'Primaries',
	        cppname: 'VideoColourPrimaries',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '2',
	        description: 'The colour primaries of the video. For clarity, the value and meanings for Primaries are adopted from Table 2 of ISO/IEC 23091-4 or ITU-T H.273.',
	    },
	    0x55bc: {
	        name: 'MaxCLL',
	        cppname: 'VideoColourMaxCLL',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'Maximum brightness of a single pixel (Maximum Content Light Level) in candelas per square meter (cd/m^2^).',
	    },
	    0x55bd: {
	        name: 'MaxFALL',
	        cppname: 'VideoColourMaxFALL',
	        level: 5,
	        type: 'u',
	        minver: 4,
	        webm: true,
	        description: 'Maximum brightness of a single full frame (Maximum Frame-Average Light Level) in candelas per square meter (cd/m^2^).',
	    },
	    0x55d0: {
	        name: 'MasteringMetadata',
	        cppname: 'VideoColourMasterMeta',
	        level: 5,
	        type: 'm',
	        minver: 4,
	        webm: true,
	        description: 'SMPTE 2086 mastering data.',
	    },
	    0x55d1: {
	        name: 'PrimaryRChromaticityX',
	        cppname: 'VideoRChromaX',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Red X chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d2: {
	        name: 'PrimaryRChromaticityY',
	        cppname: 'VideoRChromaY',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Red Y chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d3: {
	        name: 'PrimaryGChromaticityX',
	        cppname: 'VideoGChromaX',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Green X chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d4: {
	        name: 'PrimaryGChromaticityY',
	        cppname: 'VideoGChromaY',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Green Y chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d5: {
	        name: 'PrimaryBChromaticityX',
	        cppname: 'VideoBChromaX',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Blue X chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d6: {
	        name: 'PrimaryBChromaticityY',
	        cppname: 'VideoBChromaY',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'Blue Y chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d7: {
	        name: 'WhitePointChromaticityX',
	        cppname: 'VideoWhitePointChromaX',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'White X chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d8: {
	        name: 'WhitePointChromaticityY',
	        cppname: 'VideoWhitePointChromaY',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '0-1',
	        description: 'White Y chromaticity coordinate, as defined by CIE 1931.',
	    },
	    0x55d9: {
	        name: 'LuminanceMax',
	        cppname: 'VideoLuminanceMax',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '>= 0x0p+0',
	        description: 'Maximum luminance. Represented in candelas per square meter (cd/m^2^).',
	    },
	    0x55da: {
	        name: 'LuminanceMin',
	        cppname: 'VideoLuminanceMin',
	        level: 6,
	        type: 'f',
	        minver: 4,
	        webm: true,
	        range: '>= 0x0p+0',
	        description: 'Minimum luminance. Represented in candelas per square meter (cd/m^2^).',
	    },
	    0x55ee: {
	        name: 'MaxBlockAdditionID',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The maximum value of BlockAddID ((#blockaddid-element)). A value 0 means there is no BlockAdditions ((#blockadditions-element)) for this track.',
	    },
	    0x5654: {
	        name: 'ChapterStringUID',
	        level: 4,
	        type: '8',
	        minver: 3,
	        webm: true,
	        description: 'A unique string ID to identify the Chapter. Use for WebVTT cue identifier storage [@!WebVTT].',
	    },
	    0x56aa: {
	        name: 'CodecDelay',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        description: 'CodecDelay is The codec-built-in delay, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). It represents the amount of codec samples that will be discarded by the decoder during playback. This timestamp value **MUST** be subtracted from each frame timestamp in order to get the timestamp that will be actually played. The value **SHOULD** be small so the muxing of tracks with the same actual timestamp are in the same Cluster.',
	    },
	    0x56bb: {
	        name: 'SeekPreRoll',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'After a discontinuity, SeekPreRoll is the duration of the data the decoder **MUST** decode before the decoded data is valid, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks).',
	    },
	    0x5741: {
	        name: 'WritingApp',
	        level: 2,
	        type: '8',
	        mandatory: true,
	        description: 'Writing application (example: "mkvmerge-0.3.3").',
	    },
	    0x5854: {
	        name: 'SilentTracks',
	        cppname: 'ClusterSilentTracks',
	        level: 2,
	        type: 'm',
	        minver: 0,
	        maxver: 0,
	        description: 'The list of tracks that are not used in that part of the stream. It is useful when using overlay tracks on seeking or to decide what track to use.',
	    },
	    0x58d7: {
	        name: 'SilentTrackNumber',
	        cppname: 'ClusterSilentTrackNumber',
	        level: 3,
	        type: 'u',
	        multiple: true,
	        minver: 0,
	        maxver: 0,
	        description: 'One of the track number that are not used from now on in the stream. It could change later if not specified as silent in a further Cluster.',
	    },
	    0x61a7: {
	        name: 'AttachedFile',
	        cppname: 'Attached',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        description: 'An attached file.',
	    },
	    0x6240: {
	        name: 'ContentEncoding',
	        level: 4,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'Settings for one content encoding like compression or encryption.',
	    },
	    0x6264: {
	        name: 'BitDepth',
	        cppname: 'AudioBitDepth',
	        level: 4,
	        type: 'u',
	        range: 'not 0',
	        description: 'Bits per sample, mostly used for PCM.',
	    },
	    0x63a2: {
	        name: 'CodecPrivate',
	        level: 3,
	        type: 'b',
	        description: 'Private data only known to the codec.',
	    },
	    0x63c0: {
	        name: 'Targets',
	        cppname: 'TagTargets',
	        level: 3,
	        type: 'm',
	        mandatory: true,
	        webm: true,
	        description: 'Specifies which other elements the metadata represented by the Tag applies to. If empty or not present, then the Tag describes everything in the Segment.',
	    },
	    0x63c3: {
	        name: 'ChapterPhysicalEquiv',
	        level: 4,
	        type: 'u',
	        description: 'Specify the physical equivalent of this ChapterAtom like "DVD" (60) or "SIDE" (50); see (#physical-types) for a complete list of values.',
	    },
	    0x63c4: {
	        name: 'TagChapterUID',
	        level: 4,
	        type: 'u',
	        multiple: true,
	        'default': '0',
	        description: 'A unique ID to identify the Chapter(s) the tags belong to.',
	    },
	    0x63c5: {
	        name: 'TagTrackUID',
	        level: 4,
	        type: 'u',
	        multiple: true,
	        webm: true,
	        'default': '0',
	        description: 'A unique ID to identify the Track(s) the tags belong to.',
	    },
	    0x63c6: {
	        name: 'TagAttachmentUID',
	        level: 4,
	        type: 'u',
	        multiple: true,
	        'default': '0',
	        description: 'A unique ID to identify the Attachment(s) the tags belong to.',
	    },
	    0x63c9: {
	        name: 'TagEditionUID',
	        level: 4,
	        type: 'u',
	        multiple: true,
	        'default': '0',
	        description: 'A unique ID to identify the EditionEntry(s) the tags belong to.',
	    },
	    0x63ca: {
	        name: 'TargetType',
	        cppname: 'TagTargetType',
	        level: 4,
	        type: 's',
	        webm: true,
	        description: 'An informational string that can be used to display the logical level of the target like "ALBUM", "TRACK", "MOVIE", "CHAPTER", etc ; see Section 6.4 of [@!MatroskaTags].',
	    },
	    0x6532: {
	        name: 'SignedElement',
	        level: 3,
	        type: 'b',
	        multiple: true,
	        webm: false,
	        description: 'An element ID whose data will be used to compute the signature.',
	    },
	    0x6624: {
	        name: 'TrackTranslate',
	        level: 3,
	        type: 'm',
	        multiple: true,
	        description: 'The mapping between this `TrackEntry` and a track value in the given Chapter Codec.',
	    },
	    0x66a5: {
	        name: 'TrackTranslateTrackID',
	        level: 4,
	        type: 'b',
	        mandatory: true,
	        description: 'The binary value used to represent this `TrackEntry` in the chapter codec data. The format depends on the `ChapProcessCodecID` used; see (#chapprocesscodecid-element).',
	    },
	    0x66bf: {
	        name: 'TrackTranslateCodec',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        description: 'This `TrackTranslate` applies to this chapter codec of the given chapter edition(s); see (#chapprocesscodecid-element).',
	    },
	    0x66fc: {
	        name: 'TrackTranslateEditionUID',
	        level: 4,
	        type: 'u',
	        multiple: true,
	        description: 'Specify a chapter edition UID on which this `TrackTranslate` applies.',
	    },
	    0x67c8: {
	        name: 'SimpleTag',
	        cppname: 'TagSimple',
	        level: 3,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'Contains general information about the target.',
	    },
	    0x68ca: {
	        name: 'TargetTypeValue',
	        cppname: 'TagTargetTypeValue',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        'default': '50',
	        description: 'A number to indicate the logical level of the target.',
	    },
	    0x6911: {
	        name: 'ChapProcessCommand',
	        cppname: 'ChapterProcessCommand',
	        level: 5,
	        type: 'm',
	        multiple: true,
	        description: 'Contains all the commands associated to the Atom.',
	    },
	    0x6922: {
	        name: 'ChapProcessTime',
	        cppname: 'ChapterProcessTime',
	        level: 6,
	        type: 'u',
	        mandatory: true,
	        description: 'Defines when the process command **SHOULD** be handled',
	    },
	    0x6924: {
	        name: 'ChapterTranslate',
	        level: 2,
	        type: 'm',
	        multiple: true,
	        description: 'The mapping between this `Segment` and a segment value in the given Chapter Codec.',
	    },
	    0x6933: {
	        name: 'ChapProcessData',
	        cppname: 'ChapterProcessData',
	        level: 6,
	        type: 'b',
	        mandatory: true,
	        description: 'Contains the command information. The data **SHOULD** be interpreted depending on the ChapProcessCodecID value. For ChapProcessCodecID = 1, the data correspond to the binary DVD cell pre/post commands; see (#menu-features) on DVD menus.',
	    },
	    0x6944: {
	        name: 'ChapProcess',
	        cppname: 'ChapterProcess',
	        level: 4,
	        type: 'm',
	        multiple: true,
	        description: 'Contains all the commands associated to the Atom.',
	    },
	    0x6955: {
	        name: 'ChapProcessCodecID',
	        cppname: 'ChapterProcessCodecID',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'Contains the type of the codec used for the processing. A value of 0 means native Matroska processing (to be defined), a value of 1 means the DVD command set is used; see (#menu-features) on DVD menus. More codec IDs can be added later.',
	    },
	    0x69a5: {
	        name: 'ChapterTranslateID',
	        level: 3,
	        type: 'b',
	        mandatory: true,
	        description: 'The binary value used to represent this Segment in the chapter codec data. The format depends on the ChapProcessCodecID used; see (#chapprocesscodecid-element).',
	    },
	    0x69bf: {
	        name: 'ChapterTranslateCodec',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        description: 'This `ChapterTranslate` applies to this chapter codec of the given chapter edition(s); see (#chapprocesscodecid-element).',
	    },
	    0x69fc: {
	        name: 'ChapterTranslateEditionUID',
	        level: 3,
	        type: 'u',
	        multiple: true,
	        description: 'Specify a chapter edition UID on which this `ChapterTranslate` applies.',
	    },
	    0x6d80: {
	        name: 'ContentEncodings',
	        level: 3,
	        type: 'm',
	        webm: true,
	        description: 'Settings for several content encoding mechanisms like compression or encryption.',
	    },
	    0x6de7: {
	        name: 'MinCache',
	        cppname: 'TrackMinCache',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        'default': '0',
	        description: 'The minimum number of frames a player **SHOULD** be able to cache during playback. If set to 0, the reference pseudo-cache system is not used.',
	    },
	    0x6df8: {
	        name: 'MaxCache',
	        cppname: 'TrackMaxCache',
	        level: 3,
	        type: 'u',
	        description: 'The maximum cache size necessary to store referenced frames in and the current frame. 0 means no cache is needed.',
	    },
	    0x6e67: {
	        name: 'ChapterSegmentUID',
	        level: 4,
	        type: 'b',
	        range: '>0',
	        description: 'The SegmentUID of another Segment to play during this chapter.',
	    },
	    0x6ebc: {
	        name: 'ChapterSegmentEditionUID',
	        level: 4,
	        type: 'u',
	        range: 'not 0',
	        description: 'The EditionUID to play from the Segment linked in ChapterSegmentUID. If ChapterSegmentEditionUID is undeclared, then no Edition of the linked Segment is used; see (#medium-linking) on medium-linking Segments.',
	    },
	    0x6fab: {
	        name: 'TrackOverlay',
	        level: 3,
	        type: 'u',
	        multiple: true,
	        description: 'Specify that this track is an overlay track for the Track specified (in the u-integer). That means when this track has a gap, see (#silenttracks-element) on SilentTracks, the overlay track **SHOULD** be used instead. The order of multiple TrackOverlay matters, the first one is the one that **SHOULD** be used. If not found it **SHOULD** be the second, etc.',
	    },
	    0x7373: {
	        name: 'Tag',
	        level: 2,
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        webm: true,
	        description: 'A single metadata descriptor.',
	    },
	    0x7384: {
	        name: 'SegmentFilename',
	        level: 2,
	        type: '8',
	        description: 'A filename corresponding to this Segment.',
	    },
	    0x73a4: {
	        name: 'SegmentUID',
	        level: 2,
	        type: 'b',
	        range: 'not 0',
	        description: 'A randomly generated unique ID to identify the Segment amongst many others (128 bits).',
	    },
	    0x73c4: {
	        name: 'ChapterUID',
	        level: 4,
	        type: 'u',
	        mandatory: true,
	        webm: true,
	        range: 'not 0',
	        description: 'A unique ID to identify the Chapter.',
	    },
	    0x73c5: {
	        name: 'TrackUID',
	        level: 3,
	        type: 'u',
	        mandatory: true,
	        range: 'not 0',
	        description: 'A unique ID to identify the Track.',
	    },
	    0x7446: {
	        name: 'AttachmentLink',
	        cppname: 'TrackAttachmentLink',
	        level: 3,
	        type: 'u',
	        maxver: 3,
	        range: 'not 0',
	        description: 'The UID of an attachment that is used by this codec.',
	    },
	    0x75a1: {
	        name: 'BlockAdditions',
	        level: 3,
	        type: 'm',
	        webm: true,
	        description: 'Contain additional blocks to complete the main one. An EBML parser that has no knowledge of the Block structure could still see and use/skip these data.',
	    },
	    0x75a2: {
	        name: 'DiscardPadding',
	        level: 3,
	        type: 'i',
	        minver: 4,
	        webm: true,
	        description: 'Duration of the silent data added to the Block, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks) (padding at the end of the Block for positive value, at the beginning of the Block for negative value). The duration of DiscardPadding is not calculated in the duration of the TrackEntry and **SHOULD** be discarded during playback.',
	    },
	    0x7670: {
	        name: 'Projection',
	        cppname: 'VideoProjection',
	        level: 4,
	        type: 'm',
	        minver: 4,
	        webm: true,
	        description: 'Describes the video projection details. Used to render spherical, VR videos or flipping videos horizontally/vertically.',
	    },
	    0x7671: {
	        name: 'ProjectionType',
	        cppname: 'VideoProjectionType',
	        level: 5,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0',
	        description: 'Describes the projection used for this video track.',
	    },
	    0x7672: {
	        name: 'ProjectionPrivate',
	        cppname: 'VideoProjectionPrivate',
	        level: 5,
	        type: 'b',
	        minver: 4,
	        webm: true,
	        description: 'Private data that only applies to a specific projection.  *  If `ProjectionType` equals 0 (Rectangular), then this element must not be present. *  If `ProjectionType` equals 1 (Equirectangular), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Equirectangular Projection Box (\'equi\'). *  If `ProjectionType` equals 2 (Cubemap), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Cubemap Projection Box (\'cbmp\'). *  If `ProjectionType` equals 3 (Mesh), then this element must be present and contain the same binary data that would be stored inside an ISOBMFF Mesh Projection Box (\'mshp\').',
	    },
	    0x7673: {
	        name: 'ProjectionPoseYaw',
	        cppname: 'VideoProjectionPoseYaw',
	        level: 5,
	        type: 'f',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0x0p+0',
	        range: '>= -0xB4p+0, <= 0xB4p+0',
	        description: 'Specifies a yaw rotation to the projection.  Value represents a clockwise rotation, in degrees, around the up vector. This rotation must be applied before any `ProjectionPosePitch` or `ProjectionPoseRoll` rotations. The value of this element **MUST** be in the -180 to 180 degree range, both included.  Setting `ProjectionPoseYaw` to 180 or -180 degrees, with the `ProjectionPoseRoll` and `ProjectionPosePitch` set to 0 degrees flips the image horizontally.',
	    },
	    0x7674: {
	        name: 'ProjectionPosePitch',
	        cppname: 'VideoProjectionPosePitch',
	        level: 5,
	        type: 'f',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0x0p+0',
	        range: '>= -0x5Ap+0, <= 0x5Ap+0',
	        description: 'Specifies a pitch rotation to the projection.  Value represents a counter-clockwise rotation, in degrees, around the right vector. This rotation must be applied after the `ProjectionPoseYaw` rotation and before the `ProjectionPoseRoll` rotation. The value of this element **MUST** be in the -90 to 90 degree range, both included.',
	    },
	    0x7675: {
	        name: 'ProjectionPoseRoll',
	        cppname: 'VideoProjectionPoseRoll',
	        level: 5,
	        type: 'f',
	        mandatory: true,
	        minver: 4,
	        webm: true,
	        'default': '0x0p+0',
	        range: '>= -0xB4p+0, <= 0xB4p+0',
	        description: 'Specifies a roll rotation to the projection.  Value represents a counter-clockwise rotation, in degrees, around the forward vector. This rotation must be applied after the `ProjectionPoseYaw` and `ProjectionPosePitch` rotations. The value of this element **MUST** be in the -180 to 180 degree range, both included.  Setting `ProjectionPoseRoll` to 180 or -180 degrees, the `ProjectionPoseYaw` to 180 or -180 degrees with `ProjectionPosePitch` set to 0 degrees flips the image vertically.  Setting `ProjectionPoseRoll` to 180 or -180 degrees, with the `ProjectionPoseYaw` and `ProjectionPosePitch` set to 0 degrees flips the image horizontally and vertically.',
	    },
	    0x78b5: {
	        name: 'OutputSamplingFrequency',
	        cppname: 'AudioOutputSamplingFreq',
	        level: 4,
	        type: 'f',
	        range: '> 0x0p+0',
	        description: 'Real output sampling frequency in Hz (used for SBR techniques).',
	    },
	    0x7ba9: {
	        name: 'Title',
	        level: 2,
	        type: '8',
	        webm: true,
	        description: 'General name of the Segment.',
	    },
	    0x7d7b: {
	        name: 'ChannelPositions',
	        cppname: 'AudioPosition',
	        level: 4,
	        type: 'b',
	        minver: 0,
	        maxver: 0,
	        description: 'Table of horizontal angles for each successive channel.',
	    },
	    0x7e5b: {
	        name: 'SignatureElements',
	        level: 1,
	        type: 'm',
	        webm: false,
	        description: 'Contains elements that will be used to compute the signature.',
	    },
	    0x7e7b: {
	        name: 'SignatureElementList',
	        level: 2,
	        type: 'm',
	        multiple: true,
	        webm: false,
	        i: 'Cluster|Block|BlockAdditional',
	        description: 'A list consists of a number of consecutive elements that represent one case where data is used in signature. Ex:  means that the BlockAdditional of all Blocks in all Clusters is used for encryption.',
	    },
	    0x7e8a: {
	        name: 'SignatureAlgo',
	        level: 1,
	        type: 'u',
	        webm: false,
	        description: 'Signature algorithm used (1=RSA, 2=elliptic).',
	    },
	    0x7e9a: {
	        name: 'SignatureHash',
	        level: 1,
	        type: 'u',
	        webm: false,
	        description: 'Hash algorithm used (1=SHA1-160, 2=MD5).',
	    },
	    0x7ea5: {
	        name: 'SignaturePublicKey',
	        level: 1,
	        type: 'b',
	        webm: false,
	        description: 'The public key to use with the algorithm (in the case of a PKI-based signature).',
	    },
	    0x7eb5: {
	        name: 'Signature',
	        level: 1,
	        type: 'b',
	        webm: false,
	        description: 'The signature of the data (until a new.',
	    },
	    0x22b59c: {
	        name: 'Language',
	        cppname: 'TrackLanguage',
	        level: 3,
	        type: 's',
	        mandatory: true,
	        'default': 'eng',
	        description: 'Specifies the language of the track in the Matroska languages form; see (#language-codes) on language codes. This Element **MUST** be ignored if the LanguageIETF Element is used in the same TrackEntry.',
	    },
	    0x22b59d: {
	        name: 'LanguageIETF',
	        level: 3,
	        type: 's',
	        minver: 4,
	        description: 'Specifies the language of the track according to [@!BCP47] and using the IANA Language Subtag Registry [@!IANALangRegistry]. If this Element is used, then any Language Elements used in the same TrackEntry **MUST** be ignored.',
	    },
	    0x23314f: {
	        name: 'TrackTimestampScale',
	        cppname: 'TrackTimecodeScale',
	        level: 3,
	        type: 'f',
	        mandatory: true,
	        maxver: 3,
	        'default': '0x1p+0',
	        range: '> 0x0p+0',
	        description: 'DEPRECATED, DO NOT USE. The scale to apply on this track to work at normal speed in relation with other tracks (mostly used to adjust video speed when the audio length differs).',
	    },
	    0x234e7a: {
	        name: 'DefaultDecodedFieldDuration',
	        cppname: 'TrackDefaultDecodedFieldDuration',
	        level: 3,
	        type: 'u',
	        minver: 4,
	        range: 'not 0',
	        description: 'The period between two successive fields at the output of the decoding process, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks). see (#defaultdecodedfieldduration) for more information',
	    },
	    0x2383e3: {
	        name: 'FrameRate',
	        cppname: 'VideoFrameRate',
	        level: 4,
	        type: 'f',
	        minver: 0,
	        maxver: 0,
	        range: '> 0x0p+0',
	        description: 'Number of frames per second. This value is Informational only. It is intended for constant frame rate streams, and **SHOULD NOT** be used for a variable frame rate TrackEntry.',
	    },
	    0x23e383: {
	        name: 'DefaultDuration',
	        cppname: 'TrackDefaultDuration',
	        level: 3,
	        type: 'u',
	        range: 'not 0',
	        description: 'Number of nanoseconds per frame, expressed in Matroska Ticks -- ie in nanoseconds; see (#timestamp-ticks) (frame in the Matroska sense -- one Element put into a (Simple)Block).',
	    },
	    0x258688: {
	        name: 'CodecName',
	        level: 3,
	        type: '8',
	        description: 'A human-readable string specifying the codec.',
	    },
	    0x26b240: {
	        name: 'CodecDownloadURL',
	        level: 3,
	        type: 's',
	        multiple: true,
	        minver: 0,
	        maxver: 0,
	        description: 'A URL to download about the codec used.',
	    },
	    0x2ad7b1: {
	        name: 'TimestampScale',
	        cppname: 'TimecodeScale',
	        level: 2,
	        type: 'u',
	        mandatory: true,
	        'default': '1000000',
	        range: 'not 0',
	        description: 'Base unit for Segment Ticks and Track Ticks, in nanoseconds. A TimestampScale value of 1.000.000 means scaled timestamps in the Segment are expressed in milliseconds; see (#timestamps) on how to interpret timestamps.',
	    },
	    0x2ad7b2: {
	        name: 'TimecodeScaleDenominator',
	        level: 2,
	        type: 'u',
	        mandatory: true,
	        minver: 4,
	        'default': '1000000000',
	        description: 'Timestamp scale numerator, see TimecodeScale.',
	    },
	    0x2eb524: {
	        name: 'UncompressedFourCC',
	        cppname: 'VideoColourSpace',
	        level: 4,
	        type: 'b',
	        description: 'Specify the uncompressed pixel format used for the Track\'s data as a FourCC. This value is similar in scope to the biCompression value of AVI\'s `BITMAPINFO` [@?AVIFormat]. See the YUV video formats [@?FourCC-YUV] and RGB video formats [@?FourCC-RGB] for common values.',
	    },
	    0x2fb523: {
	        name: 'GammaValue',
	        cppname: 'VideoGamma',
	        level: 4,
	        type: 'f',
	        minver: 0,
	        maxver: 0,
	        range: '> 0x0p+0',
	        description: 'Gamma Value.',
	    },
	    0x3a9697: {
	        name: 'CodecSettings',
	        level: 3,
	        type: '8',
	        minver: 0,
	        maxver: 0,
	        description: 'A string describing the encoding setting used.',
	    },
	    0x3b4040: {
	        name: 'CodecInfoURL',
	        level: 3,
	        type: 's',
	        multiple: true,
	        minver: 0,
	        maxver: 0,
	        description: 'A URL to find information about the codec used.',
	    },
	    0x3c83ab: {
	        name: 'PrevFilename',
	        level: 2,
	        type: '8',
	        description: 'A filename corresponding to the file of the previous Linked Segment.',
	    },
	    0x3cb923: {
	        name: 'PrevUID',
	        level: 2,
	        type: 'b',
	        description: 'A unique ID to identify the previous Segment of a Linked Segment (128 bits).',
	    },
	    0x3e83bb: {
	        name: 'NextFilename',
	        level: 2,
	        type: '8',
	        description: 'A filename corresponding to the file of the next Linked Segment.',
	    },
	    0x3eb923: {
	        name: 'NextUID',
	        level: 2,
	        type: 'b',
	        description: 'A unique ID to identify the next Segment of a Linked Segment (128 bits).',
	    },
	    0x1043a770: {
	        name: 'Chapters',
	        level: 1,
	        type: 'm',
	        webm: true,
	        description: 'A system to define basic menus and partition data. For more detailed information, look at the Chapters explanation in (#chapters).',
	    },
	    0x114d9b74: {
	        name: 'SeekHead',
	        level: 1,
	        type: 'm',
	        multiple: true,
	        description: 'Contains the Segment Position of other Top-Level Elements.',
	    },
	    0x1254c367: {
	        name: 'Tags',
	        level: 1,
	        type: 'm',
	        multiple: true,
	        webm: true,
	        description: 'Element containing metadata describing Tracks, Editions, Chapters, Attachments, or the Segment as a whole. A list of valid tags can be found in [@!MatroskaTags].',
	    },
	    0x1549a966: {
	        name: 'Info',
	        level: 1,
	        type: 'm',
	        mandatory: true,
	        description: 'Contains general information about the Segment.',
	    },
	    0x1654ae6b: {
	        name: 'Tracks',
	        level: 1,
	        type: 'm',
	        description: 'A Top-Level Element of information with many tracks described.',
	    },
	    0x18538067: {
	        name: 'Segment',
	        level: 0,
	        type: 'm',
	        mandatory: true,
	        description: 'The Root Element that contains all other Top-Level Elements (Elements defined only at Level 1). A Matroska file is composed of 1 Segment.',
	    },
	    0x1941a469: {
	        name: 'Attachments',
	        level: 1,
	        type: 'm',
	        description: 'Contain attached files.',
	    },
	    0x1a45dfa3: {
	        name: 'EBML',
	        level: '0',
	        type: 'm',
	        mandatory: true,
	        multiple: true,
	        minver: 1,
	        description: 'Set the EBML characteristics of the data to follow. Each EBML document has to start with this.',
	    },
	    0x1b538667: {
	        name: 'SignatureSlot',
	        level: -1,
	        type: 'm',
	        multiple: true,
	        webm: false,
	        description: 'Contain signature of some (coming) elements in the stream.',
	    },
	    0x1c53bb6b: {
	        name: 'Cues',
	        level: 1,
	        type: 'm',
	        description: 'A Top-Level Element to speed seeking access. All entries are local to the Segment.',
	    },
	    0x1f43b675: {
	        name: 'Cluster',
	        level: 1,
	        type: 'm',
	        multiple: true,
	        description: 'The Top-Level Element containing the (monolithic) Block structure.',
	    },
	};
	const byName = {};
	const schema = {
	    byEbmlID,
	    byName,
	};
	for (const ebmlID in byEbmlID) {
	    const desc = byEbmlID[ebmlID];
	    byName[desc.name.replace('-', '_')] = parseInt(ebmlID, 10);
	}

	var State;
	(function (State) {
	    State[State["STATE_TAG"] = 1] = "STATE_TAG";
	    State[State["STATE_SIZE"] = 2] = "STATE_SIZE";
	    State[State["STATE_CONTENT"] = 3] = "STATE_CONTENT";
	})(State || (State = {}));
	class EBMLDecoder {
	    _bufferChunks = [];
	    _tag_stack = [];
	    _state = State.STATE_TAG;
	    _cursor = 0;
	    _total = 0;
	    _schema = schema.byEbmlID;
	    _result = [];
	    get _bufferLength() {
	        return this._bufferChunks.reduce((prev, current) => prev + current.length, 0);
	    }
	    _sliceChunks(begin, end) {
	        const slicedChunks = [];
	        let offsetStart = 0;
	        begin = begin || 0;
	        end = end || this._bufferLength;
	        if (begin < 0 || end < 0) {
	            throw new Error('begin or end cant be lower than zero');
	        }
	        if (end < begin) {
	            throw new Error('end  cant be lower than begin');
	        }
	        for (let i = 0; i < this._bufferChunks.length; i++) {
	            const chunkSize = this._bufferChunks[i].length;
	            if (begin >= offsetStart + chunkSize) {
	                offsetStart = offsetStart + chunkSize;
	                continue;
	            }
	            if (end <= offsetStart) {
	                break;
	            }
	            const _start = Math.max(begin - offsetStart, 0);
	            const _stop = Math.min(chunkSize, end - offsetStart);
	            if (_start === 0 && _stop === chunkSize) {
	                slicedChunks.push(this._bufferChunks[i]);
	            }
	            else {
	                slicedChunks.push(this._bufferChunks[i].slice(_start, _stop));
	            }
	            offsetStart = offsetStart + chunkSize;
	        }
	        return slicedChunks;
	    }
	    decode(chunks) {
	        this.readChunk(chunks);
	        const diff = this._result;
	        this._result = [];
	        return diff;
	    }
	    readChunk(chunks) {
	        this._bufferChunks = chunks.map(c => new buffer.Buffer(c));
	        while (this._cursor < this._bufferLength) {
	            if (this._state === State.STATE_TAG && !this.readTag()) {
	                break;
	            }
	            if (this._state === State.STATE_SIZE && !this.readSize()) {
	                break;
	            }
	            if (this._state === State.STATE_CONTENT && !this.readContent()) {
	                break;
	            }
	        }
	    }
	    getSchemaInfo(tagNum) {
	        return (this._schema[tagNum] || {
	            name: 'unknown',
	            level: -1,
	            type: 'unknown',
	            description: 'unknown',
	        });
	    }
	    readTag() {
	        if (this._cursor >= this._bufferLength) {
	            return false;
	        }
	        const tag = tools_1.readVint(this._bufferChunks[0], this._cursor);
	        if (tag === null) {
	            return false;
	        }
	        const buf = tools_1.concat(this._sliceChunks(this._cursor, this._cursor + tag.length));
	        const tagNum = buf.reduce((o, v, i, arr) => o + v * Math.pow(16, 2 * (arr.length - 1 - i)), 0);
	        const schema = this.getSchemaInfo(tagNum);
	        const tagObj = {
	            EBML_ID: tagNum.toString(16),
	            schema,
	            type: schema.type,
	            name: schema.name,
	            level: schema.level,
	            tagStart: this._total,
	            tagEnd: this._total + tag.length,
	            sizeStart: this._total + tag.length,
	            sizeEnd: null,
	            dataStart: null,
	            dataEnd: null,
	            dataSize: null,
	            data: null,
	        };
	        this._tag_stack.push(tagObj);
	        this._cursor += tag.length;
	        this._total += tag.length;
	        this._state = State.STATE_SIZE;
	        return true;
	    }
	    readSize() {
	        if (this._cursor >= this._bufferLength) {
	            return false;
	        }
	        const size = tools_1.readVint(this._bufferChunks[0], this._cursor);
	        if (size === null) {
	            return false;
	        }
	        const tagObj = this._tag_stack[this._tag_stack.length - 1];
	        tagObj.sizeEnd = tagObj.sizeStart + size.length;
	        tagObj.dataStart = tagObj.sizeEnd;
	        tagObj.dataSize = size.value;
	        if (size.value === -1) {
	            tagObj.dataEnd = -1;
	            if (tagObj.type === 'm') {
	                tagObj.unknownSize = true;
	            }
	        }
	        else {
	            tagObj.dataEnd = tagObj.sizeEnd + size.value;
	        }
	        this._cursor += size.length;
	        this._total += size.length;
	        this._state = State.STATE_CONTENT;
	        return true;
	    }
	    readContent() {
	        const tagObj = this._tag_stack[this._tag_stack.length - 1];
	        if (tagObj.type === 'm') {
	            tagObj.isEnd = false;
	            this._result.push(tagObj);
	            this._state = State.STATE_TAG;
	            if (tagObj.dataSize === 0) {
	                const elm = Object.assign({}, tagObj, { isEnd: true });
	                this._result.push(elm);
	                this._tag_stack.pop();
	            }
	            return true;
	        }
	        if (this._bufferLength < this._cursor + tagObj.dataSize) {
	            return false;
	        }
	        const data = tools_1.concat(this._sliceChunks(this._cursor, this._cursor + tagObj.dataSize));
	        this._bufferChunks = this._sliceChunks(this._cursor + tagObj.dataSize);
	        tagObj.data = data;
	        switch (tagObj.type) {
	            case 'u':
	                tagObj.value = data.readUIntBE(0, data.length);
	                break;
	            case 'i':
	                tagObj.value = data.readIntBE(0, data.length);
	                break;
	            case 'f':
	                tagObj.value =
	                    tagObj.dataSize === 4 ?
	                        data.readFloatBE(0) :
	                        tagObj.dataSize === 8 ?
	                            data.readDoubleBE(0) :
	                            (console.warn(`cannot read ${tagObj.dataSize} octets float. failback to 0`), 0);
	                break;
	            case 's':
	                tagObj.value = data.toString('ascii');
	                break;
	            case '8':
	                tagObj.value = data.toString('utf8');
	                break;
	            case 'b':
	                tagObj.value = data;
	                break;
	            case 'd':
	                tagObj.value = tools_1.convertEBMLDateToJSDate(new int64Buffer.Int64BE(data).toNumber());
	                break;
	        }
	        if (tagObj.value === null) {
	            throw new Error(`unknown tag type:${tagObj.type}`);
	        }
	        this._result.push(tagObj);
	        this._total += tagObj.dataSize;
	        this._state = State.STATE_TAG;
	        this._cursor = 0;
	        this._tag_stack.pop();
	        while (this._tag_stack.length > 0) {
	            const topEle = this._tag_stack[this._tag_stack.length - 1];
	            if (topEle.dataEnd < 0) {
	                this._tag_stack.pop();
	                return true;
	            }
	            if (this._total < topEle.dataEnd) {
	                break;
	            }
	            if (topEle.type !== 'm') {
	                throw new Error('parent element is not master element');
	            }
	            const elm = Object.assign({}, topEle, { isEnd: true });
	            this._result.push(elm);
	            this._tag_stack.pop();
	        }
	        return true;
	    }
	}

	/**
	 * fix webm media file without 2GB filesize limit
	 *
	 * @param the blob you need to fix
	 * @returns the blob that has been fixed
	 *
	 * using this function can not only add "Duration" but also add "SeekHead", "Seek", "SeekID", "SeekPosition" for the webm
	 * if a webm loss "SeekHead", "Seek", "SeekID", "SeekPosition" and "Cues", "CueTime", "CueTrack", "CueClusterPosition", "CueTrackPositions", "CuePoint",
	 * then the webm will not seekable when playing in chrome with builtin <video> tag
	 * that means only when all webm is donwloaded then user can seek location
	 * now with the help of ts-ebml library, this issue solved by recalculate metadata
	 * however ts-ebml doesn't support large file larger than 2 GB
	 *
	 */
	async function fixWebmMetaInfo(blob, time) {
	    const decoder = new EBMLDecoder();
	    const reader = new Reader();
	    reader.logging = false;
	    let bufSlices = [];
	    let blobSlices = [];
	    // 1GB slice is good, but dont set this value larger than 2046 * 1024 * 1024 due to new Uint8Array's limit
	    const sliceLength = 1 * 1024 * 1024 * 1024;
	    for (let i = 0; i < blob.size; i = i + sliceLength) {
	        const slice = blob.slice(i, Math.min(i + sliceLength, blob.size));
	        const bufSlice = await slice.arrayBuffer();
	        bufSlices.push(bufSlice);
	        blobSlices.push(slice);
	    }
	    decoder.decode(bufSlices).forEach(elm => reader.read(elm));
	    reader.stop();
	    const refinedMetadataBuf = tools_1.makeMetadataSeekable(reader.metadatas, parseFloat(time) || reader.duration, reader.cues);
	    const refinedMetadataBlob = new Blob([refinedMetadataBuf], { type: blob.type });
	    const firstPartBlobSlice = blobSlices.shift();
	    const firstPartBlobWithoutMetadata = firstPartBlobSlice.slice(reader.metadataSize);
	    // using Blob instead of ArrayBuffer to construct the new Blob, to minify memory leak
	    const finalBlob = new Blob([refinedMetadataBlob, firstPartBlobWithoutMetadata, ...blobSlices], { type: blob.type });
	    bufSlices = [];
	    blobSlices = [];
	    return finalBlob;
	}

	return fixWebmMetaInfo;

}));
//# sourceMappingURL=index.umd.js.map
