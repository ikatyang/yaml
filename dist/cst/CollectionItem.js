"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _errors = require("../errors");

var _Node = _interopRequireWildcard(require("./Node"));

var _Range = _interopRequireDefault(require("./Range"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

class CollectionItem extends _Node.default {
  constructor(type, props) {
    super(type, props);
    this.node = null;
  }
  /**
   * @param {ParseContext} context
   * @param {number} start - Index of first character
   * @returns {number} - Index of the character after this
   */


  parse(context, start) {
    this.context = context;
    const parseNode = context.parseNode,
          src = context.src;
    let atLineStart = context.atLineStart,
        lineStart = context.lineStart;
    if (!atLineStart && this.type === _Node.Type.SEQ_ITEM) this.error = new _errors.YAMLSemanticError(this, 'Sequence items must not have preceding content on the same line');
    const indent = atLineStart ? start - lineStart : context.indent;

    let offset = _Node.default.endOfWhiteSpace(src, start + 1);

    let ch = src[offset];

    while (ch === '\n' || ch === '#') {
      const next = offset + 1;

      if (ch === '#') {
        const end = _Node.default.endOfLine(src, next);

        this.props.push(new _Range.default(offset, end));
        offset = end;
      } else {
        atLineStart = true;
        lineStart = next;
        offset = _Node.default.endOfWhiteSpace(src, next); // against spec, to match \t allowed after indicator
      }

      ch = src[offset];
    }

    if (_Node.default.nextNodeIsIndented(ch, offset - (lineStart + indent), this.type !== _Node.Type.SEQ_ITEM)) {
      this.node = parseNode({
        atLineStart,
        inCollection: false,
        indent,
        lineStart,
        parent: this
      }, offset);
      if (this.node) offset = this.node.range.end;
    } else if (ch && lineStart > start + 1) {
      offset = lineStart - 1;
    }

    const end = this.node ? this.node.valueRange.end : offset;
    this.valueRange = new _Range.default(start, end);
    return offset;
  }

  setOrigRanges(cr, offset) {
    offset = super.setOrigRanges(cr, offset);
    return this.node ? this.node.setOrigRanges(cr, offset) : offset;
  }

  toString() {
    const src = this.context.src,
          node = this.node,
          range = this.range,
          value = this.value;
    if (value != null) return value;
    const str = node ? src.slice(range.start, node.range.start) + String(node) : src.slice(range.start, range.end);
    return _Node.default.addStringTerminator(src, range.end, str);
  }

}

exports.default = CollectionItem;
module.exports = exports.default;
module.exports.default = exports.default;