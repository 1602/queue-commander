# TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = --growl --ignore-leaks --timeout 2000
TESTS = test/*.test.js
JSHINT = ./node_modules/.bin/jshint

JS_FILES = $(shell find . -type f -name "*.js" \
					 -not -path "./node_modules/*" -and \
					 -not -path "./db/schema.js")

check:
	@$(JSHINT) $(JS_FILES) && echo 'No jshint wranings!'

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
test-integration:
	$(TESTER) $(OPTS) --reporter spec $(INTEGRATION)
test-full:
	$(TESTER) $(OPTS) --reporter spec $(TESTS) $(INTEGRATION)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)
features:
	NODE_ENV=test node_modules/.bin/cucumber.js

.PHONY: test doc docs features

