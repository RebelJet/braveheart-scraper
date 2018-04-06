eval $(aws ecr get-login --no-include-email --region us-east-1)
docker push 013715336914.dkr.ecr.us-east-1.amazonaws.com/braveheart-scraper:latest
