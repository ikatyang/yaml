"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseMap;

var _Node = require("../cst/Node");

var _PlainValue = _interopRequireDefault(require("../cst/PlainValue"));

var _errors = require("../errors");

var _Map = _interopRequireDefault(require("./Map"));

var _Merge = _interopRequireWildcard(require("./Merge"));

var _Pair = _interopRequireDefault(require("./Pair"));

var _parseUtils = require("./parseUtils");

var _Alias = _interopRequireDefault(require("./Alias"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parseMap(doc, cst) {
  if (cst.type !== _Node.Type.MAP && cst.type !== _Node.Type.FLOW_MAP) {
    var msg = "A ".concat(cst.type, " node cannot be resolved as a mapping");
    doc.errors.push(new _errors.YAMLSyntaxError(cst, msg));
    return null;
  }

  var _ref = cst.type === _Node.Type.FLOW_MAP ? resolveFlowMapItems(doc, cst) : resolveBlockMapItems(doc, cst),
      comments = _ref.comments,
      items = _ref.items;

  var map = new _Map.default();
  map.items = items;
  (0, _parseUtils.resolveComments)(map, comments);

  for (var i = 0; i < items.length; ++i) {
    var iKey = items[i].key;

    if (doc.schema.merge && iKey.value === _Merge.MERGE_KEY) {
      items[i] = new _Merge.default(items[i]);
      var sources = items[i].value.items;
      var error = null;
      sources.some(function (node) {
        if (node instanceof _Alias.default) {
          // During parsing, alias sources are CST nodes; to account for
          // circular references their resolved values can't be used here.
          var type = node.source.type;
          if (type === _Node.Type.MAP || type === _Node.Type.FLOW_MAP) return false;
          return error = 'Merge nodes aliases can only point to maps';
        }

        return error = 'Merge nodes can only have Alias nodes as values';
      });
      if (error) doc.errors.push(new _errors.YAMLSemanticError(cst, error));
    } else {
      for (var j = i + 1; j < items.length; ++j) {
        var jKey = items[j].key;

        if (iKey === jKey || iKey && jKey && iKey.hasOwnProperty('value') && iKey.value === jKey.value) {
          var _msg = "Map keys must be unique; \"".concat(iKey, "\" is repeated");

          doc.errors.push(new _errors.YAMLSemanticError(cst, _msg));
          break;
        }
      }
    }
  }

  cst.resolved = map;
  return map;
}

function resolveBlockMapItems(doc, cst) {
  var comments = [];
  var items = [];
  var key = undefined;
  var keyStart = null;

  for (var i = 0; i < cst.items.length; ++i) {
    var item = cst.items[i];

    switch (item.type) {
      case _Node.Type.COMMENT:
        comments.push({
          comment: item.comment,
          before: items.length
        });
        break;

      case _Node.Type.MAP_KEY:
        if (key !== undefined) items.push(new _Pair.default(key));
        if (item.error) doc.errors.push(item.error);
        key = doc.resolveNode(item.node);
        keyStart = null;
        break;

      case _Node.Type.MAP_VALUE:
        if (key === undefined) key = null;
        if (item.error) doc.errors.push(item.error);

        if (!item.context.atLineStart && item.node && item.node.type === _Node.Type.MAP && !item.node.context.atLineStart) {
          var msg = 'Nested mappings are not allowed in compact mappings';
          doc.errors.push(new _errors.YAMLSemanticError(item.node, msg));
        }

        var valueNode = item.node;

        if (!valueNode && item.props.length > 0) {
          // Comments on an empty mapping value need to be preserved, so we
          // need to construct a minimal empty node here to use instead of the
          // missing `item.node`. -- eemeli/yaml#19
          valueNode = new _PlainValue.default(_Node.Type.PLAIN, []);
          valueNode.context = {
            parent: item,
            src: item.context.src
          };
          var pos = item.range.start + 1;
          valueNode.range = {
            start: pos,
            end: pos
          };
          valueNode.valueRange = {
            start: pos,
            end: pos
          };
        }

        items.push(new _Pair.default(key, doc.resolveNode(valueNode)));
        (0, _parseUtils.checkKeyLength)(doc.errors, cst, i, key, keyStart);
        key = undefined;
        keyStart = null;
        break;

      default:
        if (key !== undefined) items.push(new _Pair.default(key));
        key = doc.resolveNode(item);
        keyStart = item.range.start;
        if (item.error) doc.errors.push(item.error);
        var nextItem = cst.items[i + 1];

        if (!nextItem || nextItem.type !== _Node.Type.MAP_VALUE) {
          var _msg2 = 'Implicit map keys need to be followed by map values';
          doc.errors.push(new _errors.YAMLSemanticError(item, _msg2));
        }

        if (item.valueRangeContainsNewline) {
          var _msg3 = 'Implicit map keys need to be on a single line';
          doc.errors.push(new _errors.YAMLSemanticError(item, _msg3));
        }

    }
  }

  if (key !== undefined) items.push(new _Pair.default(key));
  return {
    comments: comments,
    items: items
  };
}

function resolveFlowMapItems(doc, cst) {
  var comments = [];
  var items = [];
  var key = undefined;
  var keyStart = null;
  var explicitKey = false;
  var next = '{';

  for (var i = 0; i < cst.items.length; ++i) {
    (0, _parseUtils.checkKeyLength)(doc.errors, cst, i, key, keyStart);
    var item = cst.items[i];

    if (typeof item === 'string') {
      if (item === '?' && key === undefined && !explicitKey) {
        explicitKey = true;
        next = ':';
        continue;
      }

      if (item === ':') {
        if (key === undefined) key = null;

        if (next === ':') {
          next = ',';
          continue;
        }
      } else {
        if (explicitKey) {
          if (key === undefined && item !== ',') key = null;
          explicitKey = false;
        }

        if (key !== undefined) {
          items.push(new _Pair.default(key));
          key = undefined;
          keyStart = null;

          if (item === ',') {
            next = ':';
            continue;
          }
        }
      }

      if (item === '}') {
        if (i === cst.items.length - 1) continue;
      } else if (item === next) {
        next = ':';
        continue;
      }

      doc.errors.push(new _errors.YAMLSyntaxError(cst, "Flow map contains an unexpected ".concat(item)));
    } else if (item.type === _Node.Type.COMMENT) {
      comments.push({
        comment: item.comment,
        before: items.length
      });
    } else if (key === undefined) {
      if (next === ',') doc.errors.push(new _errors.YAMLSemanticError(item, 'Separator , missing in flow map'));
      key = doc.resolveNode(item);
      keyStart = explicitKey ? null : item.range.start; // TODO: add error for non-explicit multiline plain key
    } else {
      if (next !== ',') doc.errors.push(new _errors.YAMLSemanticError(item, 'Indicator : missing in flow map entry'));
      items.push(new _Pair.default(key, doc.resolveNode(item)));
      key = undefined;
      explicitKey = false;
    }
  }

  if (cst.items[cst.items.length - 1] !== '}') doc.errors.push(new _errors.YAMLSemanticError(cst, 'Expected flow map to end with }'));
  if (key !== undefined) items.push(new _Pair.default(key));
  return {
    comments: comments,
    items: items
  };
}