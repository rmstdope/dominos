#!/usr/bin/env bash
# Prepares a fresh Ubuntu 24.04 VPS for Dominos. Run once, as root, with the public key the deploy
# workflow will log in with:
#
#   scp deploy/setup-vps.sh root@<vps>:
#   ssh root@<vps> bash setup-vps.sh "ssh-ed25519 AAAA… github-deploy"
#
# It is safe to run again. Afterwards: a `deploy` user that may run Docker, /opt/dominos owned by
# it, a firewall that lets in only SSH, HTTP and HTTPS, SSH without passwords, and automatic
# security updates.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root." >&2
  exit 1
fi
deploy_key="${1:-}"
case "$deploy_key" in
  ssh-*) ;;
  *)
    echo "Usage: bash setup-vps.sh \"ssh-ed25519 AAAA… github-deploy\"" >&2
    exit 1
    ;;
esac

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq docker.io docker-compose-v2 ufw unattended-upgrades
systemctl enable --now docker

# The user the deploy workflow logs in as. Being in the docker group is what lets it run the
# stack; it gets no sudo.
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$deploy_key" /home/deploy/.ssh/authorized_keys ||
  echo "$deploy_key" >>/home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 750 -o deploy -g deploy /opt/dominos /opt/dominos/backups

# Only SSH, HTTP and HTTPS (HTTP/3 too) in. Docker only publishes 80 and 443, so the database is
# never reachable from outside.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Keys only. Root keeps key login, so the HostUp console and your own key still work.
cat >/etc/ssh/sshd_config.d/10-dominos.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
systemctl reload ssh

# Security updates install themselves; a reboot, when one is needed, is still up to you.
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo
echo "Done. Next: put /opt/dominos/.env in place (see deploy/.env.example), then run the"
echo "'Deploy to VPS' workflow. The full checklist is in docs/deploy.md."
