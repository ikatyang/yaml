"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _addComment = _interopRequireDefault(require("./addComment"));

var _Anchors = _interopRequireDefault(require("./Anchors"));

var _Node = require("./cst/Node");

var _errors = require("./errors");

var _listTagNames = _interopRequireDefault(require("./listTagNames"));

var _schema = _interopRequireWildcard(require("./schema"));

var _Alias = _interopRequireDefault(require("./schema/Alias"));

var _Collection = _interopRequireDefault(require("./schema/Collection"));

var _toJSON2 = _interopRequireDefault(require("./toJSON"));

var _Scalar = _interopRequireDefault(require("./schema/Scalar"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var isCollectionItem = function isCollectionItem(node) {
  return node && [_Node.Type.MAP_KEY, _Node.Type.MAP_VALUE, _Node.Type.SEQ_ITEM].includes(node.type);
};

var Document =
/*#__PURE__*/
function () {
  function Document(options) {
    _classCallCheck(this, Document);

    this.anchors = new _Anchors.default();
    this.commentBefore = null;
    this.comment = null;
    this.contents = null;
    this.errors = [];
    this.options = options;
    this.schema = null;
    this.tagPrefixes = [];
    this.version = null;
    this.warnings = [];
  }

  _createClass(Document, [{
    key: "getDefaults",
    value: function getDefaults() {
      return Document.defaults[this.version] || Document.defaults[this.options.version] || {};
    }
  }, {
    key: "setSchema",
    value: function setSchema() {
      if (!this.schema) this.schema = new _schema.default(Object.assign({}, this.getDefaults(), this.options));
    }
  }, {
    key: "parse",
    value: function parse(_ref) {
      var _this = this;

      var _ref$directives = _ref.directives,
          directives = _ref$directives === void 0 ? [] : _ref$directives,
          _ref$contents = _ref.contents,
          contents = _ref$contents === void 0 ? [] : _ref$contents,
          error = _ref.error,
          valueRange = _ref.valueRange;

      if (error) {
        if (!error.source) error.source = this;
        this.errors.push(error);
      }

      var directiveComments = [];
      directives.forEach(function (directive) {
        var comment = directive.comment,
            name = directive.name;

        switch (name) {
          case 'TAG':
            _this.resolveTagDirective(directive);

            break;

          case 'YAML':
          case 'YAML:1.0':
            _this.resolveYamlDirective(directive);

            break;

          default:
            if (name) {
              var msg = "YAML only supports %TAG and %YAML directives, and not %".concat(name);

              _this.warnings.push(new _errors.YAMLWarning(directive, msg));
            }

        }

        if (comment) directiveComments.push(comment);
      });
      this.range = valueRange ? [valueRange.start, valueRange.end] : null;
      this.setSchema();
      this.anchors._cstAliases = [];
      this.commentBefore = directiveComments.join('\n') || null;
      var comments = {
        before: [],
        after: []
      };
      var contentNodes = [];
      contents.forEach(function (node) {
        if (node.valueRange && !node.valueRange.isEmpty) {
          if (contentNodes.length === 1) {
            var msg = 'Document is not valid YAML (bad indentation?)';

            _this.errors.push(new _errors.YAMLSyntaxError(node, msg));
          }

          contentNodes.push(_this.resolveNode(node));
        } else if (node.comment) {
          var cc = contentNodes.length === 0 ? comments.before : comments.after;
          cc.push(node.comment);
        }
      });

      switch (contentNodes.length) {
        case 0:
          this.contents = null;
          comments.after = comments.before;
          break;

        case 1:
          this.contents = contentNodes[0];

          if (this.contents) {
            var cb = comments.before.join('\n') || null;

            if (cb) {
              var cbNode = this.contents instanceof _Collection.default && this.contents.items[0] ? this.contents.items[0] : this.contents;
              cbNode.commentBefore = cbNode.commentBefore ? "".concat(cb, "\n").concat(cbNode.commentBefore) : cb;
            }
          } else {
            comments.after = comments.before.concat(comments.after);
          }

          break;

        default:
          this.contents = contentNodes;

          if (this.contents[0]) {
            this.contents[0].commentBefore = comments.before.join('\n') || null;
          } else {
            comments.after = comments.before.concat(comments.after);
          }

      }

      this.comment = comments.after.join('\n') || null;
      this.anchors.resolveNodes();
      return this;
    }
  }, {
    key: "resolveTagDirective",
    value: function resolveTagDirective(directive) {
      var _directive$parameters = _slicedToArray(directive.parameters, 2),
          handle = _directive$parameters[0],
          prefix = _directive$parameters[1];

      if (handle && prefix) {
        if (this.tagPrefixes.every(function (p) {
          return p.handle !== handle;
        })) {
          this.tagPrefixes.push({
            handle: handle,
            prefix: prefix
          });
        } else {
          var msg = 'The %TAG directive must only be given at most once per handle in the same document.';
          this.errors.push(new _errors.YAMLSemanticError(directive, msg));
        }
      } else {
        var _msg = 'Insufficient parameters given for %TAG directive';
        this.errors.push(new _errors.YAMLSemanticError(directive, _msg));
      }
    }
  }, {
    key: "resolveYamlDirective",
    value: function resolveYamlDirective(directive) {
      var _directive$parameters2 = _slicedToArray(directive.parameters, 1),
          version = _directive$parameters2[0];

      if (directive.name === 'YAML:1.0') version = '1.0';

      if (this.version) {
        var msg = 'The %YAML directive must only be given at most once per document.';
        this.errors.push(new _errors.YAMLSemanticError(directive, msg));
      }

      if (!version) {
        var _msg2 = 'Insufficient parameters given for %YAML directive';
        this.errors.push(new _errors.YAMLSemanticError(directive, _msg2));
      } else {
        if (!Document.defaults[version]) {
          var v0 = this.version || this.options.version;

          var _msg3 = "Document will be parsed as YAML ".concat(v0, " rather than YAML ").concat(version);

          this.warnings.push(new _errors.YAMLWarning(directive, _msg3));
        }

        this.version = version;
      }
    }
  }, {
    key: "resolveTagName",
    value: function resolveTagName(node) {
      var tag = node.tag,
          type = node.type;
      var nonSpecific = false;

      if (tag) {
        var handle = tag.handle,
            suffix = tag.suffix,
            verbatim = tag.verbatim;

        if (verbatim) {
          if (verbatim !== '!' && verbatim !== '!!') return verbatim;
          var msg = "Verbatim tags aren't resolved, so ".concat(verbatim, " is invalid.");
          this.errors.push(new _errors.YAMLSemanticError(node, msg));
        } else if (handle === '!' && !suffix) {
          nonSpecific = true;
        } else {
          var prefix = this.tagPrefixes.find(function (p) {
            return p.handle === handle;
          });

          if (!prefix) {
            var dtp = this.getDefaults().tagPrefixes;
            if (dtp) prefix = dtp.find(function (p) {
              return p.handle === handle;
            });
          }

          if (prefix) {
            if (suffix) {
              if (handle === '!' && (this.version || this.options.version) === '1.0') {
                if (suffix[0] === '^') return suffix;

                if (/[:/]/.test(suffix)) {
                  // word/foo -> tag:word.yaml.org,2002:foo
                  var vocab = suffix.match(/^([a-z0-9-]+)\/(.*)/i);
                  return vocab ? "tag:".concat(vocab[1], ".yaml.org,2002:").concat(vocab[2]) : "tag:".concat(suffix);
                }
              }

              return prefix.prefix + decodeURIComponent(suffix);
            }

            this.errors.push(new _errors.YAMLSemanticError(node, "The ".concat(handle, " tag has no suffix.")));
          } else {
            var _msg4 = "The ".concat(handle, " tag handle is non-default and was not declared.");

            this.errors.push(new _errors.YAMLSemanticError(node, _msg4));
          }
        }
      }

      switch (type) {
        case _Node.Type.BLOCK_FOLDED:
        case _Node.Type.BLOCK_LITERAL:
        case _Node.Type.QUOTE_DOUBLE:
        case _Node.Type.QUOTE_SINGLE:
          return _schema.DefaultTags.STR;

        case _Node.Type.FLOW_MAP:
        case _Node.Type.MAP:
          return _schema.DefaultTags.MAP;

        case _Node.Type.FLOW_SEQ:
        case _Node.Type.SEQ:
          return _schema.DefaultTags.SEQ;

        case _Node.Type.PLAIN:
          return nonSpecific ? _schema.DefaultTags.STR : null;

        default:
          return null;
      }
    }
  }, {
    key: "resolveNode",
    value: function resolveNode(node) {
      if (!node) return null;
      var anchors = this.anchors,
          errors = this.errors,
          schema = this.schema;
      var hasAnchor = false;
      var hasTag = false;
      var comments = {
        before: [],
        after: []
      };
      var props = isCollectionItem(node.context.parent) ? node.context.parent.props.concat(node.props) : node.props;
      props.forEach(function (_ref2, i) {
        var start = _ref2.start,
            end = _ref2.end;

        switch (node.context.src[start]) {
          case _Node.Char.COMMENT:
            if (!node.commentHasRequiredWhitespace(start)) {
              var msg = 'Comments must be separated from other tokens by white space characters';
              errors.push(new _errors.YAMLSemanticError(node, msg));
            }

            var c = node.context.src.slice(start + 1, end);
            var header = node.header,
                valueRange = node.valueRange;

            if (valueRange && (start > valueRange.start || header && start > header.start)) {
              comments.after.push(c);
            } else {
              comments.before.push(c);
            }

            break;

          case _Node.Char.ANCHOR:
            if (hasAnchor) {
              var _msg5 = 'A node can have at most one anchor';
              errors.push(new _errors.YAMLSemanticError(node, _msg5));
            }

            hasAnchor = true;
            break;

          case _Node.Char.TAG:
            if (hasTag) {
              var _msg6 = 'A node can have at most one tag';
              errors.push(new _errors.YAMLSemanticError(node, _msg6));
            }

            hasTag = true;
            break;
        }
      });

      if (hasAnchor) {
        var name = node.anchor;
        var prev = anchors.getNode(name); // At this point, aliases for any preceding node with the same anchor
        // name have already been resolved, so it may safely be renamed.

        if (prev) anchors.map[anchors.newName(name)] = prev; // During parsing, we need to store the CST node in anchors.map as
        // anchors need to be available during resolution to allow for
        // circular references.

        anchors.map[name] = node;
      }

      var res;

      if (node.type === _Node.Type.ALIAS) {
        if (hasAnchor || hasTag) {
          var msg = 'An alias node must not specify any properties';
          errors.push(new _errors.YAMLSemanticError(node, msg));
        }

        var _name = node.rawValue;
        var src = anchors.getNode(_name);

        if (!src) {
          var _msg7 = "Aliased anchor not found: ".concat(_name);

          errors.push(new _errors.YAMLReferenceError(node, _msg7));
          return null;
        } // Lazy resolution for circular references


        res = new _Alias.default(src);

        anchors._cstAliases.push(res);

        if (!src.resolved) {
          var _msg8 = 'Alias node contains a circular reference, which cannot be resolved as JSON';
          this.warnings.push(new _errors.YAMLWarning(node, _msg8));
        }
      } else {
        var tagName = this.resolveTagName(node);

        if (tagName) {
          res = schema.resolveNodeWithFallback(this, node, tagName);
        } else {
          if (node.type !== _Node.Type.PLAIN) {
            var _msg9 = "Failed to resolve ".concat(node.type, " node here");

            errors.push(new _errors.YAMLSyntaxError(node, _msg9));
            return null;
          }

          try {
            res = schema.resolveScalar(node.strValue || '');
          } catch (error) {
            if (!error.source) error.source = node;
            errors.push(error);
            return null;
          }
        }
      }

      if (res) {
        res.range = [node.range.start, node.range.end];
        if (this.options.keepCstNodes) res.cstNode = node;
        if (this.options.keepNodeTypes) res.type = node.type;
        var cb = comments.before.join('\n');

        if (cb) {
          res.commentBefore = res.commentBefore ? "".concat(res.commentBefore, "\n").concat(cb) : cb;
        }

        var ca = comments.after.join('\n');
        if (ca) res.comment = res.comment ? "".concat(res.comment, "\n").concat(ca) : ca;
      }

      return node.resolved = res;
    }
  }, {
    key: "listNonDefaultTags",
    value: function listNonDefaultTags() {
      return (0, _listTagNames.default)(this.contents).filter(function (t) {
        return t.indexOf(_schema.defaultPrefix) !== 0;
      });
    }
  }, {
    key: "setTagPrefix",
    value: function setTagPrefix(handle, prefix) {
      if (handle[0] !== '!' || handle[handle.length - 1] !== '!') throw new Error('Handle must start and end with !');

      if (prefix) {
        var prev = this.tagPrefixes.find(function (p) {
          return p.handle === handle;
        });
        if (prev) prev.prefix = prefix;else this.tagPrefixes.push({
          handle: handle,
          prefix: prefix
        });
      } else {
        this.tagPrefixes = this.tagPrefixes.filter(function (p) {
          return p.handle !== handle;
        });
      }
    }
  }, {
    key: "stringifyTag",
    value: function stringifyTag(tag) {
      if ((this.version || this.options.version) === '1.0') {
        var priv = tag.match(/^tag:private\.yaml\.org,2002:([^:/]+)$/);
        if (priv) return '!' + priv[1];
        var vocab = tag.match(/^tag:([a-zA-Z0-9-]+)\.yaml\.org,2002:(.*)/);
        return vocab ? "!".concat(vocab[1], "/").concat(vocab[2]) : "!".concat(tag.replace(/^tag:/, ''));
      } else {
        var p = this.tagPrefixes.find(function (p) {
          return tag.indexOf(p.prefix) === 0;
        });

        if (!p) {
          var dtp = this.getDefaults().tagPrefixes;
          p = dtp && dtp.find(function (p) {
            return tag.indexOf(p.prefix) === 0;
          });
        }

        if (!p) return tag[0] === '!' ? tag : "!<".concat(tag, ">");
        var suffix = tag.substr(p.prefix.length).replace(/[!,\[]{}]/g, function (ch) {
          return {
            '!': '%21',
            ',': '%2C',
            '[': '%5B',
            ']': '%5D',
            '{': '%7B',
            '}': '%7D'
          }[ch];
        });
        return p.handle + suffix;
      }
    }
  }, {
    key: "toJSON",
    value: function toJSON(arg) {
      var cr = this.warnings.find(function (w) {
        return /circular reference/.test(w.message);
      });
      if (cr) throw new _errors.YAMLSemanticError(cr.source, cr.message);
      var keep = this.options.keepBlobsInJSON && (typeof arg !== 'string' || !(this.contents instanceof _Scalar.default));
      return (0, _toJSON2.default)(this.contents, arg, keep);
    }
  }, {
    key: "toString",
    value: function toString() {
      if (this.errors.length > 0) throw new Error('Document with errors cannot be stringified');
      this.setSchema();
      var lines = [];
      if (this.commentBefore) lines.push(this.commentBefore.replace(/^/gm, '#'));
      var hasDirectives = false;

      if (this.version) {
        var vd = '%YAML 1.2';

        if (this.schema.name === 'yaml-1.1') {
          if (this.version === '1.0') vd = '%YAML:1.0';else if (this.version === '1.1') vd = '%YAML 1.1';
        }

        lines.push(vd);
        hasDirectives = true;
      }

      var tagNames = this.listNonDefaultTags();
      this.tagPrefixes.forEach(function (_ref3) {
        var handle = _ref3.handle,
            prefix = _ref3.prefix;

        if (tagNames.some(function (t) {
          return t.indexOf(prefix) === 0;
        })) {
          lines.push("%TAG ".concat(handle, " ").concat(prefix));
          hasDirectives = true;
        }
      });
      if (hasDirectives) lines.push('---');
      var ctx = {
        anchors: {},
        doc: this,
        indent: ''
      };

      if (this.contents) {
        if (this.contents.commentBefore) lines.push(this.contents.commentBefore.replace(/^/gm, '#')); // top-level block scalars need to be indented if followed by a comment

        ctx.forceBlockIndent = !!this.comment;
        var comment = this.contents.comment;
        var body = this.schema.stringify(this.contents, ctx, function () {
          comment = null;
        });
        lines.push((0, _addComment.default)(body, '', comment));
      } else if (this.contents !== undefined) {
        lines.push(this.schema.stringify(this.contents, ctx));
      }

      if (this.comment) lines.push(this.comment.replace(/^/gm, '#'));
      return lines.join('\n') + '\n';
    }
  }]);

  return Document;
}();

exports.default = Document;

_defineProperty(Document, "defaults", {
  '1.0': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: _schema.defaultPrefix
    }, {
      handle: '!!',
      prefix: 'tag:private.yaml.org,2002:'
    }]
  },
  '1.1': {
    schema: 'yaml-1.1',
    merge: true,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: _schema.defaultPrefix
    }]
  },
  '1.2': {
    schema: 'core',
    merge: false,
    tagPrefixes: [{
      handle: '!',
      prefix: '!'
    }, {
      handle: '!!',
      prefix: _schema.defaultPrefix
    }]
  }
});