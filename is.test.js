/* eslint {no-loss-of-precision:0, no-new-object:0, no-new-wrappers:0} */
const is = require('./is.js');

/* test fixtures */
const ARRAY = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
const BIGINT = BigInt(81129638414606663681390495662081);
const BINARY = 0b00101010;
const FALSE = false;
const HEX = 0x5a7F0FB9a909a5b3e9B1CEf540bc53F8DE18D87e;
const NEGATIVE_NUMBER = -1;
const OBJECT = {key: 'value'};
const POSITIVE_NUMBER = 18650;
const STRING = 'The quick brown fox jumps over the lazy dog';
const WHITESPACE = '  \v  \t \r\n    \n\f ';

/* test cases */
afterEach(() => {
    jest.clearAllMocks();
});

describe('is.js', () => {
    test('exists', () => expect(is).toBeTruthy());

    /* is.nullOrEmpty() unit tests */
    describe('is.nullOrEmpty()', () => {
        test('exists', () => expect(is.nullOrEmpty).toBeTruthy());

        describe('given a function that returns', () => { // these should all be false, functions are non-empty for our purposes
            test('empty array', () => expect(is.nullOrEmpty(() => [])).toEqual(FALSE));
            test('empty object', () => expect(is.nullOrEmpty(() => {})).toEqual(FALSE));
            test('empty string - instantiated', () => expect(is.nullOrEmpty(() => new String(''))).toEqual(FALSE));
            test('empty string - literal', () => expect(is.nullOrEmpty(() => '')).toEqual(FALSE));
            test('false', () => expect(is.nullOrEmpty(() => false)).toEqual(FALSE));
            test('negative number', () => expect(is.nullOrEmpty(() => NEGATIVE_NUMBER)).toEqual(FALSE));
            test('non-empty array', () => expect(is.nullOrEmpty(() => ARRAY)).toEqual(FALSE));
            test('non-empty string', () => expect(is.nullOrEmpty(() => STRING)).toEqual(FALSE));
            test('null', () => expect(is.nullOrEmpty(() => null)).toEqual(FALSE));
            test('number - instantiated', () => expect(is.nullOrEmpty(() => new Number(POSITIVE_NUMBER))).toEqual(FALSE));
            test('number - literal', () => expect(is.nullOrEmpty(() => POSITIVE_NUMBER)).toEqual(FALSE));
            test('true', () => expect(is.nullOrEmpty(() => true)).toEqual(FALSE));
            test('undefined', () => expect(is.nullOrEmpty(() => undefined)).toEqual(FALSE));
            test('whitespace', () => expect(is.nullOrEmpty(() => WHITESPACE)).toEqual(FALSE));
            test('zero - instantiated', () => expect(is.nullOrEmpty(() => new Number(0))).toEqual(FALSE));
            test('zero - literal', () => expect(is.nullOrEmpty(() => 0)).toEqual(FALSE));
        });

        describe('literals', () => {
            test('binary', () => expect(is.nullOrEmpty(0b00101010)).toEqual(false));
            test('empty array', () => expect(is.nullOrEmpty([])).toEqual(true));
            test('empty object', () => expect(is.nullOrEmpty({})).toEqual(true));
            test('empty string', () => expect(is.nullOrEmpty('')).toEqual(true));
            test('false', () => expect(is.nullOrEmpty(false)).toEqual(false));
            test('hexadecimal', () => expect(is.nullOrEmpty(0xFFFF00)).toEqual(false));
            test('negative number', () => expect(is.nullOrEmpty(-1)).toEqual(false));
            test('non-empty array', () => expect(is.nullOrEmpty(['one', 'two', 'three'])).toEqual(false));
            test('non-empty object', () => expect(is.nullOrEmpty({key: 'value'})).toEqual(false));
            test('non-empty string', () => expect(is.nullOrEmpty('yeet')).toEqual(false));
            test('null', () => expect(is.nullOrEmpty(null)).toEqual(true));
            test('number', () => expect(is.nullOrEmpty(132)).toEqual(false));
            test('true', () => expect(is.nullOrEmpty(true)).toEqual(false));
            test('undefined', () => expect(is.nullOrEmpty(undefined)).toEqual(true));
            test('whitespace', () => expect(is.nullOrEmpty('    \n\t')).toEqual(true));
            test('zero', () => expect(is.nullOrEmpty(0)).toEqual(false));
        });

        describe('plain object', () => {
            test('bigint', () => expect(is.nullOrEmpty(BIGINT)).toEqual(false));
            test('binary', () => expect(is.nullOrEmpty(BINARY)).toEqual(false));
            test('empty array', () => expect(is.nullOrEmpty(Array([]))).toEqual(true));
            test('empty object', () => expect(is.nullOrEmpty(Object({}))).toEqual(true));
            test('empty string', () => expect(is.nullOrEmpty(String(''))).toEqual(true));
            test('false', () => expect(is.nullOrEmpty(Boolean(false))).toEqual(false));
            test('hexadecimal', () => expect(is.nullOrEmpty(HEX)).toEqual(false));
            test('negative number', () => expect(is.nullOrEmpty(NEGATIVE_NUMBER)).toEqual(false));
            test('non-empty array', () => expect(is.nullOrEmpty(ARRAY)).toEqual(false));
            test('non-empty object', () => expect(is.nullOrEmpty(OBJECT)).toEqual(false));
            test('non-empty string', () => expect(is.nullOrEmpty(STRING)).toEqual(false));
            test('number', () => expect(is.nullOrEmpty(POSITIVE_NUMBER)).toEqual(false));
            test('true', () => expect(is.nullOrEmpty(Boolean(true))).toEqual(false));
            test('whitespace', () => expect(is.nullOrEmpty(WHITESPACE)).toEqual(true));
            test('zero', () => expect(is.nullOrEmpty(Number(0))).toEqual(false));
        });

        describe('object from constructor', () => { // primitives from constructors are treated differently than primitives from literals sometimes
            test('binary', () => expect(is.nullOrEmpty(new Number(BINARY))).toEqual(false));
            test('empty array', () => expect(is.nullOrEmpty(new Array([]))).toEqual(true));
            test('empty object', () => expect(is.nullOrEmpty(new Object())).toEqual(true));
            test('empty string', () => expect(is.nullOrEmpty(new String(''))).toEqual(true));
            test('false', () => expect(is.nullOrEmpty(new Boolean(false))).toEqual(false));
            test('hexadecimal', () => expect(is.nullOrEmpty(new Number(HEX))).toEqual(false));
            test('negative number', () => expect(is.nullOrEmpty(new Number(NEGATIVE_NUMBER))).toEqual(false));
            test('non-empty array', () => expect(is.nullOrEmpty(new Array(ARRAY))).toEqual(false));
            test('non-empty object', () => expect(is.nullOrEmpty(new Object(OBJECT))).toEqual(false));
            test('non-empty string', () => expect(is.nullOrEmpty(new String(STRING))).toEqual(false));
            test('number', () => expect(is.nullOrEmpty(new Number(POSITIVE_NUMBER))).toEqual(false));
            test('true', () => expect(is.nullOrEmpty(new Boolean(true))).toEqual(false));
            test('whitespace', () => expect(is.nullOrEmpty(new String(WHITESPACE))).toEqual(true));
            test('zero', () => expect(is.nullOrEmpty(new Number(0))).toEqual(false));
        });
    });

    /* is.string() unit tests */
    describe('is.string()', () => {
        test('exists', () => expect(is.string).toBeTruthy());

        describe('given a function that returns', () => { // these should all be false, functions aren't strings
            test('empty array', () => expect(is.string(() => [])).toEqual(FALSE));
            test('empty object', () => expect(is.string(() => {})).toEqual(FALSE));
            test('empty string - instantiated', () => expect(is.string(() => new String(''))).toEqual(FALSE));
            test('empty string - literal', () => expect(is.string(() => '')).toEqual(FALSE));
            test('false', () => expect(is.string(() => false)).toEqual(FALSE));
            test('negative number', () => expect(is.string(() => NEGATIVE_NUMBER)).toEqual(FALSE));
            test('non-empty array', () => expect(is.string(() => ARRAY)).toEqual(FALSE));
            test('non-empty string', () => expect(is.string(() => STRING)).toEqual(FALSE));
            test('null', () => expect(is.string(() => null)).toEqual(FALSE));
            test('number - instantiated', () => expect(is.string(() => new Number(POSITIVE_NUMBER))).toEqual(FALSE));
            test('number - literal', () => expect(is.string(() => POSITIVE_NUMBER)).toEqual(FALSE));
            test('true', () => expect(is.string(() => true)).toEqual(FALSE));
            test('undefined', () => expect(is.string(() => undefined)).toEqual(FALSE));
            test('whitespace', () => expect(is.string(() => WHITESPACE)).toEqual(FALSE));
            test('zero - instantiated', () => expect(is.string(() => new Number(0))).toEqual(FALSE));
            test('zero - literal', () => expect(is.string(() => 0)).toEqual(FALSE));
        });

        describe('literals', () => {
            test('binary', () => expect(is.string(0b00101010)).toEqual(false));
            test('empty array', () => expect(is.string([])).toEqual(false));
            test('empty object', () => expect(is.string({})).toEqual(false));
            test('empty string', () => expect(is.string('')).toEqual(true));
            test('false', () => expect(is.string(false)).toEqual(false));
            test('hexadecimal', () => expect(is.string(0x7F00FF)).toEqual(false));
            test('negative number', () => expect(is.string(-1)).toEqual(false));
            test('non-empty array', () => expect(is.string(['one', 'two', 'three'])).toEqual(false));
            test('non-empty object', () => expect(is.string({key: 'value'})).toEqual(false));
            test('non-empty string', () => expect(is.string('yeet')).toEqual(true));
            test('null', () => expect(is.string(null)).toEqual(false));
            test('number', () => expect(is.string(143)).toEqual(false));
            test('true', () => expect(is.string(true)).toEqual(false));
            test('undefined', () => expect(is.string(undefined)).toEqual(false));
            test('whitespace', () => expect(is.string('\t\t\r\n    ')).toEqual(true));
            test('zero', () => expect(is.string(0)).toEqual(false));
        });

        describe('plain object', () => {
            test('bigint', () => expect(is.string(BIGINT)).toEqual(false));
            test('binary', () => expect(is.string(BINARY)).toEqual(false));
            test('empty array', () => expect(is.string(Array([]))).toEqual(false));
            test('empty object', () => expect(is.string(Object({}))).toEqual(false));
            test('empty string', () => expect(is.string(String(''))).toEqual(true));
            test('false', () => expect(is.string(Boolean(false))).toEqual(false));
            test('hexadecimal', () => expect(is.string(HEX)).toEqual(false));
            test('negative number', () => expect(is.string(NEGATIVE_NUMBER)).toEqual(false));
            test('non-empty array', () => expect(is.string(ARRAY)).toEqual(false));
            test('non-empty object', () => expect(is.string(OBJECT)).toEqual(false));
            test('non-empty string', () => expect(is.string(STRING)).toEqual(true));
            test('number', () => expect(is.string(POSITIVE_NUMBER)).toEqual(false));
            test('true', () => expect(is.string(Boolean(true))).toEqual(false));
            test('whitespace', () => expect(is.string(WHITESPACE)).toEqual(true));
            test('zero', () => expect(is.string(Number(0))).toEqual(false));
        });

        describe('object from constructor', () => { // primitives from constructors are treated differently than primitives from literals sometimes
            test('binary', () => expect(is.string(new Number(BINARY))).toEqual(false));
            test('empty array', () => expect(is.string(new Array([]))).toEqual(false));
            test('empty object', () => expect(is.string(new Object())).toEqual(false));
            test('empty string', () => expect(is.string(new String(''))).toEqual(true));
            test('false', () => expect(is.string(new Boolean(false))).toEqual(false));
            test('hexadecimal', () => expect(is.string(new Number(HEX))).toEqual(false));
            test('negative number', () => expect(is.string(new Number(NEGATIVE_NUMBER))).toEqual(false));
            test('non-empty array', () => expect(is.string(new Array(ARRAY))).toEqual(false));
            test('non-empty object', () => expect(is.string(new Object(OBJECT))).toEqual(false));
            test('non-empty string', () => expect(is.string(new String(STRING))).toEqual(true));
            test('number', () => expect(is.string(new Number(POSITIVE_NUMBER))).toEqual(false));
            test('true', () => expect(is.string(new Boolean(true))).toEqual(false));
            test('whitespace', () => expect(is.string(new String(WHITESPACE))).toEqual(true));
            test('zero', () => expect(is.string(new Number(0))).toEqual(false));
        });
    });
});
