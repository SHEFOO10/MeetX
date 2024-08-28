sudo netstat -tlpn | grep "443" | awk '{print $7}' | cut -d '/' -f 1 | xargs -r sudo kill -9
