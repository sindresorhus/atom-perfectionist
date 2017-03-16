/** @babel */
import {CompositeDisposable} from 'atom';
import postcss from 'postcss';
import perfectionist from 'perfectionist';
import postcssSafeParser from 'postcss-safe-parser';
import postcssScss from 'postcss-scss';

const SUPPORTED_SCOPES = new Set([
	'source.css',
	'source.css.scss'
]);

function init(editor, onSave) {
	const selectedText = onSave ? null : editor.getSelectedText();
	const text = selectedText || editor.getText();
	const config = atom.config.get('perfectionist');
	const parser = editor.getGrammar().scopeName === 'source.css' ? postcssSafeParser : postcssScss;

	if (config.indentType === 'tab') {
		config.indentChar = '\t';
		config.indentSize = 1;
	}

	postcss(perfectionist(config)).process(text, {parser}).then(result => {
		result.warnings().forEach(x => {
			console.warn(x.toString());
			atom.notifications.addWarning('Perfectionist', {detail: x.toString()});
		});

		const cursorPosition = editor.getCursorBufferPosition();
		const line = atom.views.getView(editor).getFirstVisibleScreenRow() +
			editor.getVerticalScrollMargin();

		if (selectedText) {
			editor.setTextInBufferRange(editor.getSelectedBufferRange(), result.css);
		} else {
			editor.getBuffer().setTextViaDiff(result.css);
		}

		editor.setCursorBufferPosition(cursorPosition);

		if (editor.getScreenLineCount() > line) {
			editor.scrollToScreenPosition([line, 0]);
		}
	}).catch(err => {
		if (err.name === 'CssSyntaxError') {
			err.message += err.showSourceCode();
		}

		console.error(err);
		atom.notifications.addError('Perfectionist', {detail: err.message});
	});
}

export const config = {
	formatOnSave: {
		type: 'boolean',
		default: false
	},
	cascade: {
		description: 'Visual cascading of vendor prefixed properties. Note that this transform only applies to the `expanded` format.',
		type: 'boolean',
		default: true
	},
	colorCase: {
		description: 'Transform hexadecimal colors to the chosen case.',
		type: 'string',
		default: 'lower',
		enum: [
			'lower',
			'upper'
		]
	},
	colorShorthand: {
		description: 'Shorten hexadecimal colors.',
		type: 'boolean',
		default: true
	},
	format: {
		description: 'Note that the `compressed` format only facilitates simple whitespace compression around selectors & declarations. For more powerful compression, see [cssnano](https://github.com/ben-eb/cssnano).',
		type: 'string',
		default: 'expanded',
		enum: [
			'expanded',
			'compact',
			'compressed'
		]
	},
	indentType: {
		description: 'Indentation character.',
		type: 'string',
		default: 'space',
		enum: [
			'space',
			'tab'
		]
	},
	indentSize: {
		description: 'This number will be used as a basis for all indent levels, using the expanded format.',
		type: 'number',
		default: 4
	},
	trimLeadingZero: {
		description: 'Trim leading zero for fractional numbers less than 1.',
		type: 'boolean',
		default: true
	},
	trimTrailingZeros: {
		description: 'Trim trailing zeros in numbers.',
		type: 'boolean',
		default: true
	},
	maxAtRuleLength: {
		description: 'If set to a positive integer, set a maximum width for at-rule parameters; if they exceed this, they will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform only applies to the `expanded` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	},
	maxSelectorLength: {
		description: 'If set to a positive integer, set a maximum width for a selector string; if it exceeds this, it will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform is excluded from the `compressed` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	},
	maxValueLength: {
		description: 'If set to a positive integer, set a maximum width for a property value; if it exceeds this, it will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform only applies to the `expanded` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	},
	zeroLengthNoUnit: {
		description: 'Trim units after zero length.',
		type: 'boolean',
		default: true
	}
};

export function deactivate() {
	this.subscriptions.dispose();
}

export function activate() {
	this.subscriptions = new CompositeDisposable();

	this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
		editor.getBuffer().onWillSave(() => {
			const isCSS = SUPPORTED_SCOPES.has(editor.getGrammar().scopeName);

			if (isCSS && atom.config.get('perfectionist.formatOnSave')) {
				init(editor, true);
			}
		});
	}));

	this.subscriptions.add(atom.commands.add('atom-workspace', 'perfectionist:beautify-css', () => {
		const editor = atom.workspace.getActiveTextEditor();

		if (editor) {
			init(editor);
		}
	}));
}
