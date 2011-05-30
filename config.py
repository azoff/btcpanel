import os

# used for debugging
IS_DEV_MODE = os.environ['SERVER_SOFTWARE'].startswith('Dev')

# Mt.Gox Exchange API
MTGOX_API_URL = 'https://mtgox.com/code/%s.php'