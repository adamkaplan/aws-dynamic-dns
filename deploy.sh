#!bash

# AWS Credentials (Fill these in)
export AWS_ACCESS_KEY_ID=''
export AWS_SECRET_ACCESS_KEY=''

# AWS Region to deploy into
export AWS_REGION='us-east-1'

# This is you AWS API Gateway ID, and must be set. Ansible currently
# cannot do a "create unless exists" for API Gateways. If you do not
# set this value, a NEW API Gateway will be created for you, and it's
# ID will be logged.
#
# If you've already run this playbook once, then you must set the
# API Gatway ID here to prevent the playbook from re-creating it.
#
# Basically leave this blank for the first run, then never after.
#export API_GATEWAY_ID=''

# This is the main zone that will be used for Dynamic DNS
# For example, "mydomain.com" would mean that new entries
# for dynamic DNS would be "home.mydomain.com"
export DYNDNS_DOMAIN='example.com'

# The subdomain to use as the Dynamic DNS API.
# This does not need to be under the DYNDNS_DOMAIN, but
# if it is not, you need to set up the Hosted Zone yourself.
export DYNDNS_API_DOMAIN="api.${DYNDNS_DOMAIN}"

ansible-playbook -vvv ansible/deploy.yml
