$$.control.registerControl('input-label', {
	props: {
		val: 10
	},
	init: function (elt) {
		//console.log('props', this.props)
		const { val } = this.props
		const span = $('<span>').appendTo(elt)
			.text(val)
			.click(function () {
				const label = this
				//console.log('onClick', this.textContent)

				const originalValue = $(this).text();
				let validated = false;

				const input = document.createElement("input");
				input.type = "text";
				input.value = originalValue;
				input.className = "input-edit";

				label.replaceWith(input);
				input.focus();

				// Validation uniquement avec Enter
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						label.textContent = input.value;
						elt.trigger('input-label-change', input.value)
						validated = true;
						input.replaceWith(label);

					}

					// Optionnel : Escape pour annuler
					if (e.key === "Escape") {
						validated = true;
						input.replaceWith(label);
					}
				});

				// Perte de focus = annulation
				input.addEventListener("blur", () => {
					if (validated) return
					input.replaceWith(label);
				});
			})

		this.getValue = function () {
			return span.text()
		}
	}
})