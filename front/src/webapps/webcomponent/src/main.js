// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {


		customElements.define('custom-test', class extends HTMLElement {

			static get observedAttributes() {
				return ['attr1'];
			  }

			constructor() {
				super()

				const rootShadow = this.attachShadow({mode: "open"})
				this.label = document.createElement('label')
				const style = document.createElement('style')
				style.textContent= `
					label {
						border: 1px solid red;
						padding: 5px;
					}
				`
				rootShadow.appendChild(style)

				rootShadow.appendChild(this.label)
			}

			connectedCallback() {
				console.log('Custom square element added to page.');
			  }
			
			  disconnectedCallback() {
				console.log('Custom square element removed from page.');
			  }
			
			  adoptedCallback() {
				console.log('Custom square element moved to new page.');
			  }
			
			  attributeChangedCallback(name, oldValue, newValue) {
				console.log('Custom square element attributes changed.', name, oldValue, newValue);
				this.label.textContent = newValue
			  }
		})
		const ctrl = $$.viewController(elt, {
			data: {
				text: 'Hello',
				options: {
					attr1: 'toto',
					opt2: 10
				}
			},
			events: {
			}
		})

	}


});




